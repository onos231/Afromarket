"use client";

import { useEffect, useState } from "react";
import SwapDetailsModal from "./components/SwapDetailsModal";
import { useSearchParams } from "next/navigation";

type Offer = {
  id: string;
  have_name: string;
  have_quantity: string;
  have_category: string;
  have_image?: string | null;
  have_owner: string;
  want_name: string;
  want_quantity: string;
  want_category: string;
  want_image?: string | null;
  want_owner: string;
  location: string;
  message: string;
  status: "pending" | "matched" | string;
  timestamp: string;
  matched_with?: string | null;
};

export default function LandingPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<{ offer: Offer; matched: Offer | null } | null>(null);
  const [currentUser, setCurrentUser] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // ✅ declare filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const searchParams = useSearchParams();

  useEffect(() => {
    const storedUser = localStorage.getItem("afromarket_owner") || "";
    setCurrentUser(storedUser);
  }, []);

  const fetchOffers = async () => {
  try {
    let page = 1;
    let allOffers: Offer[] = [];

    while (true) {
      const res = await fetch(`http://localhost:8000/offers?page=${page}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();

      const pageOffers: Offer[] = data.offers || [];
      allOffers = [...allOffers, ...pageOffers];

      if (!data.next_page) break;
      page = data.next_page;
    }

    // ✅ Collect matched offers for each
    const matchIds = allOffers.map((o) => o.matched_with).filter((id): id is string => !!id);
    const matchedOffers: Offer[] = await Promise.all(
      matchIds.map(async (id) => {
        const res = await fetch(`http://localhost:8000/offers/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        return data.offer || data;
      })
    );

    const combined = [...allOffers, ...matchedOffers];
    const uniqueOffers = combined.filter(
      (offer, index, self) => index === self.findIndex((o) => o.id === offer.id)
    );

    console.log("Fetched offers:", uniqueOffers);
    setOffers(uniqueOffers);
  } catch (err) {
    console.error("Error fetching offers:", err);
  }
};


  // ✅ Always run on mount, and whenever query params change
  useEffect(() => {
  fetchOffers();
}, [searchParams]);   // ✅ refetch when ?refresh changes


  // filters
  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.have_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.want_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || offer.have_category === categoryFilter;
    const matchesLocation = !locationFilter || offer.location === locationFilter;
    const matchesOwner = !ownerFilter || offer.have_owner === ownerFilter;
    return matchesSearch && matchesCategory && matchesLocation && matchesOwner;
  });

  // only show one card per user when matched
  // ✅ Show matched offers only if they involve the current user
const matchedDealsForUser = filteredOffers.filter(
  (offer) =>
    offer.status === "matched" &&
    (offer.have_owner === currentUser || offer.want_owner === currentUser)
);

// ✅ Show ALL pending offers (yours + others)
const pendingDeals = filteredOffers.filter((offer) => offer.status === "pending");

// ✅ Combine them
const visibleOffers = [...matchedDealsForUser, ...pendingDeals];


  // frontend pagination
  const totalPages = Math.ceil(visibleOffers.length / pageSize);
  const paginatedOffers = visibleOffers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-green-600 text-center">Afromarket</h1>
      <p className="text-center text-gray-600 mt-2">Available Food Items for Swap</p>

      {/* Search + Filters */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border rounded w-full"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="">All Categories</option>
          <option value="Roots">Roots</option>
          <option value="Oils">Oils</option>
          <option value="Grains">Grains</option>
          <option value="Tubers">Tubers</option>
          <option value="Legumes">Legumes</option>
          <option value="Spices">Spices</option>
        </select>

        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="">All Locations</option>
          <option value="Benin City">Benin City</option>
          <option value="Lagos">Lagos</option>
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="p-2 border rounded w-full"
        >
          <option value="">All Owners</option>
          <option value="Akpofure">Akpofure</option>
          <option value="Ngozi">Ngozi</option>
        </select>
      </div>

      {/* Offers Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedOffers.map((offer) => (
          <div
            key={offer.id}
            className="card bg-white p-4 rounded shadow cursor-pointer hover:shadow-lg transition"
            onClick={() => {
              const matchedOffer = offers.find((o) => o.id === offer.matched_with);
              if (!matchedOffer) {
                setSelected({ offer, matched: null });
                return;
              }
              const isOfferEarlier = new Date(offer.timestamp) < new Date(matchedOffer.timestamp);
              const creatorOffer = isOfferEarlier ? offer : matchedOffer;
              const responderOffer = isOfferEarlier ? matchedOffer : offer;
              setSelected({ offer: creatorOffer, matched: responderOffer });
            }}
          >
            <img
              src={offer.have_image || "/images/default.png"}
              alt={offer.have_name}
              className="w-full h-48 object-cover rounded mb-4"
            />
            <h2 className="text-xl font-semibold text-green-700">
              {offer.have_name} ({offer.have_quantity})
            </h2>
            <p className="text-gray-700">Category: {offer.have_category}</p>
            <p className="text-gray-700">Owner: {offer.have_owner}</p>
            <p className="text-gray-700">Location: {offer.location}</p>
            <p className="text-sm text-gray-500">
              Sent: {new Date(offer.timestamp).toLocaleString()}
            </p>
            <p className="mt-2 italic text-gray-600">“{offer.message}”</p>
            <span
              className={`mt-4 inline-block px-3 py-1 rounded text-sm font-medium ${
                offer.status === "pending"
                  ? "bg-green-100 text-green-700"
                  : offer.status === "matched"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {offer.status}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      <div className="flex justify-center items-center gap-4 mt-8">
        <button
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Modal */}
  {selected && (
    <SwapDetailsModal
  offer={selected.offer}
  matchedOffer={selected.matched}
  currentUser={currentUser}
  onClose={() => setSelected(null)}
  onStatusChange={(newStatus) => {
  setOffers((prev) =>
    prev.map((o) =>
      o.id === selected.offer.id || o.id === selected.matched?.id
        ? { ...o, status: newStatus }
        : o
    )
  );

  const token = localStorage.getItem("token");
  if (token) {
    fetchOffers(token);   // refresh active offers
    // fetchHistory(token);  // refresh completed/expired offers
  }
}}
/>
  )}

  {/* Floating Create Swap Offer button */}
  <a
    href="/swap"
    className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-700 transition"
  >
    + Create Swap Offer
  </a>
</main>
);
}
