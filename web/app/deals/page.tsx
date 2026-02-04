"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import SwapDetailsModal from "../components/SwapDetailsModal";

type Offer = {
  id: string;
  have_item?: {
    name: string;
    quantity: string;
    category: string;
    image?: string | null;
    owner: string;
  };
  want_item?: {
    name: string;
    quantity: string;
    category: string;
    image?: string | null;
    owner: string;
  };
  // fallback flat fields
  have_name?: string;
  have_quantity?: string;
  have_category?: string;
  have_image?: string | null;
  have_owner?: string;
  want_name?: string;
  want_quantity?: string;
  want_category?: string;
  want_image?: string | null;
  want_owner?: string;

  location: string;
  message: string;
  status: "pending" | "matched" | "completed" | "expired" | string;
  timestamp: string;
  matched_with?: string | null;
};

type TokenPayload = {
  sub: string;
  exp: number;
};

export default function DealsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [deals, setDeals] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<{ offer: Offer; matched: Offer | null } | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const router = useRouter();

  const fetchDeals = async (token: string) => {
  try {
    const res = await fetch("http://localhost:8000/offers/active", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    const dealsArray: Offer[] = data.active_offers || [];
    setDeals(dealsArray);
    console.log("Fetched deals:", dealsArray);
  } catch (err) {
    console.error("Failed to fetch deals", err);
  }
};


useEffect(() => {
const token = localStorage.getItem("token");
if (!token) {
  router.push("/auth");
  return;
}

try {
  const decoded: TokenPayload = jwtDecode(token);
  const normalizedOwner =
    decoded.sub && decoded.sub !== "undefined" && decoded.sub !== "null"
      ? decoded.sub
      : null;
  setOwner(normalizedOwner);

  // ✅ Fetch deals directly
  fetchDeals(token);
} catch (err) {
  console.error("Invalid token", err);
  router.push("/auth");
}
}, [router]);


  useEffect(() => {
    if (!owner) return;
    setDeals(
      offers.filter((o) => {
        const haveOwner = o.have_item?.owner || o.have_owner;
        const wantOwner = o.want_item?.owner || o.want_owner;
        return haveOwner === owner || wantOwner === owner;
      })
    );
  }, [offers, owner]);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-green-600 text-center">My Deals</h1>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deals.map((deal) => {
          const haveName = deal.have_item?.name || deal.have_name;
          const haveQuantity = deal.have_item?.quantity || deal.have_quantity;
          const haveOwner = deal.have_item?.owner || deal.have_owner;
          const haveCategory = deal.have_item?.category || deal.have_category;
          const haveImage = deal.have_item?.image || deal.have_image;

          return (
            <div
              key={deal.id}
              className="bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-lg"
              onClick={async () => {
                let match = offers.find((o) => o.id === deal.matched_with) || null;

                if (!match && deal.matched_with) {
                  try {
                    const res = await fetch(`http://localhost:8000/offers/${deal.matched_with}`);
                    if (res.ok) {
                      const data = await res.json();
                      match = data || null;
                    } else {
                      console.warn("Matched offer not found:", deal.matched_with);
                    }
                  } catch (err) {
                    console.error("Failed to fetch matched offer", err);
                  }
                }

                setSelected({ offer: deal, matched: match });
              }}
            >
              <img
                src={
                  (() => {
                    if (haveImage) return haveImage;
                    const category = haveCategory?.toLowerCase();
                    if (category === "roots") {
                      return "https://images.unsplash.com/photo-1604908177522-6f8f7c4b3f3f?auto=format&fit=crop&w=400&q=80";
                    } else if (category === "oils") {
                      return "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=400&q=80";
                    } else if (category === "grains") {
                      return "https://images.unsplash.com/photo-1584270354949-1c1a8f3f3e3f?auto=format&fit=crop&w=400&q=80";
                    } else {
                      return "https://via.placeholder.com/200x150.png?text=Food+Item";
                    }
                  })()
                }
                alt={haveName || "Food Item"}
                className="w-full h-40 object-cover rounded mb-4"
              />

              <h2 className="text-xl font-semibold text-green-600">
                {haveName} ({haveQuantity})
              </h2>
              <p>
                <strong>Owner:</strong> {haveOwner}
              </p>
              <p>
                <strong>Location:</strong> {deal.location}
              </p>
              <p>
                <strong>Status:</strong> {deal.status}
              </p>
            </div>
          );
        })}
      </div>

      {selected && owner && (() => {
  const offerA = selected.offer;
  const offerB = selected.matched;

  if (!offerB) {
    return (
      <SwapDetailsModal
        offer={offerA}
        matchedOffer={null}
        currentUser={owner}
        onClose={() => setSelected(null)}
      />
    );
  }

  // ✅ Use timestamp comparison like LandingPage

  // If only one offer is selected
if (offerA && !offerB) {
  return (
    <SwapDetailsModal
      offer={offerA}
      matchedOffer={null}
      currentUser={owner}
      onClose={() => setSelected(null)}
      onStatusChange={(newStatus) => {
        // Update local state for single offer
        setDeals((prev) =>
          prev.map((d) =>
            d.id === offerA.id ? { ...d, status: newStatus } : d
          )
        );

        // Refresh from backend so LandingPage and DealsPage stay in sync
        const token = localStorage.getItem("token");
        if (token) {
          fetchDeals(token);
        }
      }}
    />
  );
}

// ✅ Use timestamp comparison like LandingPage
const isOfferAEarlier = new Date(offerA.timestamp) < new Date(offerB.timestamp);
const creatorOffer = isOfferAEarlier ? offerA : offerB;
const responderOffer = isOfferAEarlier ? offerB : offerA;

return (
  <SwapDetailsModal
    key={`${creatorOffer.id}-${responderOffer.id}`}
    offer={creatorOffer}
    matchedOffer={responderOffer}
    currentUser={owner}
    onClose={() => setSelected(null)}
    onStatusChange={(newStatus) => {
      // ✅ Update both creator and responder in local state
      setDeals((prev) =>
        prev.map((d) =>
          d.id === creatorOffer.id || d.id === responderOffer.id
            ? { ...d, status: newStatus }
            : d
        )
      );

      // ✅ Refresh from backend so LandingPage and DealsPage stay in sync
      const token = localStorage.getItem("token");
      if (token) {
        fetchDeals(token);
      }
    }}
  />
);
})()}

    </main>
  );
}
