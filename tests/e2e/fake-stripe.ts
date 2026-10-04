/*
 * Faux Stripe pour les tests de parcours : il imite l'API des sessions Checkout, une page de paiement
 * et les notifications signées (même schéma de signature que Stripe). Aucune donnée ne sort de la machine.
 *
 *   npx tsx tests/e2e/fake-stripe.ts
 *
 * Variables : FAKE_STRIPE_PORT (12111), STRIPE_WEBHOOK_SECRET, APP_URL (adresse du site testé).
 */
import { createHmac, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = Number(process.env.FAKE_STRIPE_PORT ?? 12111);
const SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_faux_secret_des_tests";
const APP_URL = (process.env.APP_URL ?? "http://localhost:3100").replace(/\/+$/, "");
const SELF = `http://127.0.0.1:${PORT}`;

type Json = Record<string, unknown>;
type Session = Json & {
  id: string;
  amount_total: number;
  currency: string;
  status: "open" | "complete" | "expired";
  payment_status: "unpaid" | "paid";
  payment_intent: string | null;
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
};

const sessions = new Map<string, Session>();
const byIdempotencyKey = new Map<string, string>();

function id(prefix: string): string {
  return `${prefix}_test_${randomBytes(12).toString("hex")}`;
}

/** Décode un corps « a[b][0][c]=1 » comme le fait l'API de Stripe. */
function parseForm(body: string): Json {
  const root: Json = {};
  for (const [key, value] of new URLSearchParams(body)) {
    const path = key.match(/[^[\]]+/g) ?? [key];
    let node: Json = root;
    path.forEach((part, index) => {
      if (index === path.length - 1) {
        node[part] = value;
        return;
      }
      node[part] ??= {};
      node = node[part] as Json;
    });
  }
  return root;
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function send(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function html(response: ServerResponse, body: string) {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Paiement de test</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 40px auto; padding: 0 16px">${body}</body></html>`);
}

function redirect(response: ServerResponse, location: string) {
  response.writeHead(303, { Location: location });
  response.end();
}

/** Notification signée comme celles de Stripe : en-tête « t=…,v1=HMAC-SHA256(t.corps) ». */
async function notify(type: string, object: Json): Promise<number> {
  const payload = JSON.stringify({
    id: id("evt"),
    object: "event",
    api_version: "2026-09-30.endive",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: { object },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", SECRET).update(`${timestamp}.${payload}`).digest("hex");
  const result = await fetch(`${APP_URL}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${timestamp},v1=${signature}` },
    body: payload,
  });
  return result.status;
}

function createSession(params: Json): Session {
  const items = (params.line_items ?? {}) as Record<string, { quantity?: string; price_data?: Json }>;
  const first = Object.values(items)[0] ?? {};
  const price = (first.price_data ?? {}) as Json;
  const quantity = Number(first.quantity ?? 1);
  const session: Session = {
    id: id("cs"),
    object: "checkout.session",
    mode: params.mode ?? "payment",
    status: "open",
    payment_status: "unpaid",
    amount_total: Number(price.unit_amount ?? 0) * quantity,
    currency: String(price.currency ?? "eur"),
    client_reference_id: (params.client_reference_id as string | undefined) ?? null,
    customer_email: (params.customer_email as string | undefined) ?? null,
    metadata: (params.metadata ?? {}) as Record<string, string>,
    payment_intent: null,
    success_url: String(params.success_url ?? ""),
    cancel_url: String(params.cancel_url ?? ""),
    expires_at: Number(params.expires_at ?? Math.floor(Date.now() / 1000) + 3600),
    livemode: false,
    url: "",
    product: ((price.product_data ?? {}) as Json).name ?? "",
  };
  session.url = `${SELF}/pay/${session.id}`;
  sessions.set(session.id, session);
  return session;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", SELF);
  const parts = url.pathname.split("/").filter(Boolean);
  try {
    // API : création et lecture d'une session Checkout.
    if (request.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const key = request.headers["idempotency-key"];
      const known = typeof key === "string" ? byIdempotencyKey.get(key) : undefined;
      if (known) return send(response, 200, sessions.get(known));
      const session = createSession(parseForm(await readBody(request)));
      if (typeof key === "string") byIdempotencyKey.set(key, session.id);
      return send(response, 200, session);
    }
    if (request.method === "GET" && parts[0] === "v1" && parts[1] === "checkout" && parts[2] === "sessions") {
      const session = sessions.get(parts[3] ?? "");
      if (!session) {
        return send(response, 404, {
          error: {
            type: "invalid_request_error",
            code: "resource_missing",
            message: "No such checkout.session",
          },
        });
      }
      return send(response, 200, session);
    }

    // Page de paiement.
    const session = sessions.get(parts[1] ?? "");
    if (parts[0] === "pay" && session && request.method === "GET") {
      const amount = (session.amount_total / 100).toFixed(2).replace(".", ",");
      return html(
        response,
        `<h1>Paiement de test</h1>
<p>${String(session.product)} : <strong>${amount} €</strong></p>
<form method="post" action="/pay/${session.id}/confirm"><button type="submit">Payer</button></form>
<form method="post" action="/pay/${session.id}/confirm?notifier=0" style="margin-top: 12px">
<button type="submit">Payer sans notification</button></form>
<form method="post" action="/pay/${session.id}/cancel" style="margin-top: 12px"><button type="submit">Annuler</button></form>`,
      );
    }
    if (parts[0] === "pay" && session && request.method === "POST" && parts[2] === "confirm") {
      if (session.status === "open") {
        session.status = "complete";
        session.payment_status = "paid";
        session.payment_intent = id("pi");
        if (url.searchParams.get("notifier") !== "0") await notify("checkout.session.completed", session);
      }
      return redirect(response, session.success_url.replace("{CHECKOUT_SESSION_ID}", session.id));
    }
    if (parts[0] === "pay" && session && request.method === "POST" && parts[2] === "cancel") {
      return redirect(response, session.cancel_url);
    }

    // Commandes des tests : notifications envoyées à la demande.
    if (parts[0] === "__test" && request.method === "POST") {
      const target = sessions.get(parts[2] ?? "");
      if (!target) return send(response, 404, { error: "session inconnue" });
      if (parts[1] === "notifier") {
        return send(response, 200, { status: await notify("checkout.session.completed", target) });
      }
      if (parts[1] === "expirer") {
        target.status = "expired";
        return send(response, 200, { status: await notify("checkout.session.expired", target) });
      }
      if (parts[1] === "rembourser") {
        const charge = {
          id: id("ch"),
          object: "charge",
          amount: target.amount_total,
          amount_refunded: target.amount_total,
          currency: target.currency,
          payment_intent: target.payment_intent,
          refunded: true,
        };
        return send(response, 200, { status: await notify("charge.refunded", charge) });
      }
    }
    if (request.method === "GET" && url.pathname === "/__test/sessions") {
      return send(response, 200, [...sessions.values()]);
    }
    send(response, 404, {
      error: { type: "invalid_request_error", message: `Route inconnue : ${url.pathname}` },
    });
  } catch (error) {
    send(response, 500, { error: { type: "api_error", message: String(error) } });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Faux Stripe prêt sur ${SELF} (notifications vers ${APP_URL})`);
});
