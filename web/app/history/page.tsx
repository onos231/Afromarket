"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../components/AuthGuard";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [owner, setOwner] = useState("");

  useEffect(() => {
    console.log("Stored owner:", localStorage.getItem("afromarket_owner"));
console.log("Stored username:", localStorage.getItem("username"));

  // ✅ Try both keys: "afromarket_owner" (new) and "username" (old)
  const storedOwner =
    localStorage.getItem("afromarket_owner") ||
    localStorage.getItem("username") ||
    "";

  setOwner(storedOwner); // ✅ set immediately

  fetch("http://localhost:8000/offers", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
    .then((res) => res.json())
    .then((data) => {
      const offersArray = Array.isArray(data) ? data : data.offers || [];

      const myOffers = offersArray.filter((offer: any) => {
        const owner = offer?.have_item?.owner;
        return (
          owner &&
          storedOwner &&
          owner.toLowerCase() === storedOwner.toLowerCase()
        );
      });

      setHistory(myOffers);
    })
    .catch((err) => {
      console.error("Error fetching history:", err);
      setHistory([]);
    });

  const updateOwner = () => {
    const newOwner =
      localStorage.getItem("afromarket_owner") ||
      localStorage.getItem("username") ||
      "";
    setOwner(newOwner);
  };

  window.addEventListener("afromarket_login", updateOwner);
  window.addEventListener("afromarket_logout", updateOwner);

  return () => {
    window.removeEventListener("afromarket_login", updateOwner);
    window.removeEventListener("afromarket_logout", updateOwner);
  };
}, []);


  // ✅ Handlers for complete/decline
  const handleComplete = async (offerId: string) => {
    try {
      await fetch(`http://localhost:8000/offers/${offerId}/complete`, {
        method: "POST",
      });
      // Update UI locally
      setHistory((prev) =>
        prev.map((o) =>
          o.id === offerId ? { ...o, status: "completed" } : o
        )
      );
    } catch (err) {
      console.error("Error completing offer:", err);
    }
  };

  const handleDecline = async (offerId: string) => {
    try {
      await fetch(`http://localhost:8000/offers/${offerId}/decline`, {
        method: "POST",
      });
      // Update UI locally
      setHistory((prev) =>
        prev.map((o) =>
          o.id === offerId ? { ...o, status: "declined" } : o
        )
      );
    } catch (err) {
      console.error("Error declining offer:", err);
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-green-600 text-center">Swap History</h1>
<p className="text-center text-gray-600 mt-2">
Past swaps for {owner || "Guest"}
</p>


        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-md p-6 flex flex-col hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-green-700">
                {item.have_item.name} ({item.have_item.quantity})
              </h2>
              <p className="text-gray-700">Category: {item.have_item.category}</p>
              <p className="text-gray-700">Owner: {item.have_item.owner}</p>
              <p className="text-gray-700">Location: {item.location}</p>
              <p className="text-sm text-gray-500">
                Sent: {new Date(item.timestamp).toLocaleString()}
              </p>

              {/* Status display */}
              {item.status === "matched" ? (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-700">
                  Matched with{" "}
                  {
                    (() => {
                      const other = history.find(
                        (o: any) => o.id === item.matched_with
                      );
                      return other ? other.have_item.owner : "another user";
                    })()
                  }
                </span>
              ) : item.status === "completed" ? (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700">
                  Completed Swap
                </span>
              ) : item.status === "expired" ? (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-red-100 text-red-700">
                  Expired Swap
                </span>
              ) : item.status === "declined" ? (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-red-200 text-red-800">
                  Declined Offer
                </span>
              ) : (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-yellow-100 text-yellow-700">
                  Pending Offer
                </span>
              )}

              {/* ✅ Action buttons */}
              {item.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleComplete(item.id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleDecline(item.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
