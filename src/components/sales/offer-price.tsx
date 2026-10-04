import type { Offer } from "@/lib/data/offers";
import { formatDay } from "@/lib/dates";
import { formatEuros } from "@/lib/money";

/** Prix TTC ; pendant le lancement, le prix habituel est barré et la date de fin du prix indiquée. */
export function OfferPrice({
  offer,
}: {
  offer: Pick<Offer, "priceCents" | "regularPriceCents" | "promoUntil">;
}) {
  const promo = offer.promoUntil !== null && offer.priceCents < offer.regularPriceCents;
  return (
    <p className="price">
      {promo && (
        <>
          <s>
            <span className="visually-hidden">Prix habituel : </span>
            {formatEuros(offer.regularPriceCents)}
          </s>{" "}
        </>
      )}
      <b>
        {promo && <span className="visually-hidden">Prix de lancement : </span>}
        {formatEuros(offer.priceCents)}
      </b>
      <small>{promo ? `jusqu’au ${formatDay(offer.promoUntil!)}` : "paiement unique"}</small>
    </p>
  );
}
