import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce } from "./csp";

describe("politique de sécurité du contenu", () => {
  const base = { nonce: "abc123", supabaseUrl: "https://projet.supabase.co/", secure: true, dev: false };

  it("n'autorise que les scripts du site portant le nonce de la requête", () => {
    const policy = contentSecurityPolicy(base);
    expect(policy).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic';");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("limite les connexions au site et à Supabase", () => {
    expect(contentSecurityPolicy(base)).toContain("connect-src 'self' https://projet.supabase.co;");
    expect(contentSecurityPolicy({ ...base, supabaseUrl: "pas une adresse" })).toContain(
      "connect-src 'self';",
    );
  });

  it("assouplit seulement ce qu'exige le serveur de développement", () => {
    const policy = contentSecurityPolicy({ ...base, secure: false, dev: true });
    expect(policy).toContain("'strict-dynamic' 'unsafe-eval'");
    expect(policy).toContain("ws: wss:");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("tire un nonce différent à chaque fois", () => {
    const first = createNonce();
    expect(first).toMatch(/^[A-Za-z0-9+/=]{40,}$/);
    expect(createNonce()).not.toBe(first);
  });
});
