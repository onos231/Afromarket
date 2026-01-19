// web/app/utils/match.ts
export type Offer = {
  id: string;
  status: string;
  have_item: { name: string };
  want_item: { name: string };
  owner: string;
  matched_with?: string;
};

export function tryMatchOffers(newOffer: Offer, allOffers: Offer[]): Offer | null {
  for (const other of allOffers) {
    if (
      other.id !== newOffer.id &&
      other.status !== "matched" &&
      newOffer.have_item.name === other.want_item.name &&
      newOffer.want_item.name === other.have_item.name &&
      newOffer.owner !== other.owner
    ) {
      newOffer.status = "matched";
      newOffer.matched_with = other.id;
      other.status = "matched";
      other.matched_with = newOffer.id;
      return other;
    }
  }
  return null;
}
