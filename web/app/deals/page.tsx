"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import SwapDetailsModal from "../components/SwapDetailsModal";

type Offer = {
  id: string;
  have_item: {
    name: string;
    quantity: string;
    category: string;
    image?: string | null;
    owner: string;
  };
  want_item: {
    name: string;
    quantity: string;
    category: string;
    image?: string | null;
    owner: string;
  };
  location: string;
  message: string;
  status: "pending" | "matched" | "completed" | "expired" | string;
  timestamp: string;
  matched_with?: string | null;
};

type TokenPayload = {
  sub: string; // username stored in JWT "sub" claim
  exp: number;
};

export default function DealsPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [deals, setDeals] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<{ offer: Offer; matched: Offer | null } | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const router = useRouter();

  const fetchOffers = async (token: string) => {
    try {
      const res = await fetch("http://localhost:8000/offers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      const offersArray: Offer[] = Array.isArray(data) ? data : data.offers || [];
      setOffers(offersArray);
    } catch (err) {
      console.error("Failed to fetch offers", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth"); // redirect if not logged in
      return;
    }

    try {
      const decoded: TokenPayload = jwtDecode(token);
      const normalizedOwner =
        decoded.sub && decoded.sub !== "undefined" && decoded.sub !== "null"
          ? decoded.sub
          : null;
      setOwner(normalizedOwner);
      fetchOffers(token);
    } catch (err) {
      console.error("Invalid token", err);
      router.push("/auth");
    }
  }, [router]);

  useEffect(() => {
    if (!owner) return;
    setDeals(offers.filter((o) => o.have_owner === owner || o.want_owner === owner));

  }, [offers, owner]);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-green-600 text-center">My Deals</h1>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deals.map((deal) => (
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

  setSelected({ offer: deal, matched: match || null });
}}

          >
            <img
            src={
(() => {
  const category = deal.have_category?.toLowerCase();
  if (deal.have_image) {
    return deal.have_image;

                  } else if (category === "roots") {
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
              alt={deal.have_name}
              className="w-full h-40 object-cover rounded mb-4"
            />

            <h2 className="text-xl font-semibold text-green-600">
  {deal.have_name} ({deal.have_quantity})
</h2>
<p>
  <strong>Owner:</strong> {deal.have_owner}
</p>
            <p>
              <strong>Location:</strong> {deal.location}
            </p>
            <p>
              <strong>Status:</strong> {deal.status}
            </p>
          </div>
        ))}
      </div>

      {selected && (
        <SwapDetailsModal
          key={`${selected.offer.id}-${selected.matched?.id || "none"}`}
          offer={selected.offer}
          matchedOffer={selected.matched}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
