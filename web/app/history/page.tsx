"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../components/AuthGuard";

type Offer = {
  id: string;
  have_item: {
    name: string;
    quantity: string;
    category: string;
    owner: string;
    image?: string | null;
  };
  want_item?: {
    name: string;
    quantity: string;
    category: string;
    owner: string;
    image?: string | null;
  };
  location: string;
  status: "pending" | "matched" | "completed" | "expired" | "declined";
  timestamp: string;
  matched_with?: string | null;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<Offer[]>([]);
  const [owner, setOwner] = useState("");

  // ✅ Fetch history offers
  const fetchHistory = async (token: string, storedOwner: string) => {
  try {
    console.log("🔧 fetchHistory called");
    console.log("Token:", token);
    console.log("Stored owner:", storedOwner);

    const res = await fetch("http://localhost:8000/offers/history", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Response status:", res.status);

    const data = await res.json();
    console.log("Raw response data:", data);

    // ✅ Use the correct field from backend
    const offersArray: Offer[] = data.history || [];

    console.log("Normalized offersArray:", offersArray);

    const myOffers = offersArray.filter((offer: any) => {
  const haveOwner = offer.have_owner || offer?.have_item?.owner;
  const wantOwner = offer.want_owner || offer?.want_item?.owner;

  const match =
    (haveOwner && haveOwner.toLowerCase() === storedOwner.toLowerCase()) ||
    (wantOwner && wantOwner.toLowerCase() === storedOwner.toLowerCase());

  console.log(
    `Offer ${offer.id} -> haveOwner=${haveOwner}, wantOwner=${wantOwner}, match=${match}`
  );

  return match;
});

    console.log("Filtered myOffers:", myOffers);

    setHistory(myOffers);
  } catch (err) {
    console.error("❌ Error fetching history:", err);
    setHistory([]);
  }
};


  useEffect(() => {
    const storedOwner =
      localStorage.getItem("afromarket_owner") ||
      localStorage.getItem("username") ||
      "";
    setOwner(storedOwner);

    const token = localStorage.getItem("token");
    if (token && storedOwner) {
      fetchHistory(token, storedOwner);
    }

    const updateOwner = () => {
      const newOwner =
        localStorage.getItem("afromarket_owner") ||
        localStorage.getItem("username") ||
        "";
      setOwner(newOwner);
      if (token && newOwner) {
        fetchHistory(token, newOwner);
      }
    };

    window.addEventListener("afromarket_login", updateOwner);
    window.addEventListener("afromarket_logout", updateOwner);

    return () => {
      window.removeEventListener("afromarket_login", updateOwner);
      window.removeEventListener("afromarket_logout", updateOwner);
    };
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold text-green-600 text-center">
          Swap History
        </h1>
        <p className="text-center text-gray-600 mt-2">
          Past swaps for {owner || "Guest"}
        </p>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end">
        <button
onClick={async () => {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch("http://localhost:8000/offers/history/clear", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await res.json();

    if (res.ok) {
      setHistory([]); // ✅ clear UI immediately
      alert(result.message || "All history cleared successfully!");
    } else {
      alert(result.detail || result.message || "Failed to clear history");
    }
  } catch (err) {
    console.error("❌ Error clearing history:", err);
    alert("Could not clear history. Please try again.");
  }
}}
className="px-4 py-2 bg-white text-red-600 border border-gray-300 rounded hover:bg-gray-100"
>
Clear All History
</button>
        </div>


        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md p-6 flex flex-col hover:shadow-lg transition"
            >
            <h2 className="text-xl font-semibold text-green-700">
{item.have_name} ({item.have_quantity})
</h2>
<p className="text-gray-700">Category: {item.have_category}</p>
<p className="text-gray-700">Owner: {item.have_owner}</p>
<p className="text-gray-700">Location: {item.location}</p>
<p className="text-sm text-gray-500">
Sent: {new Date(item.timestamp).toLocaleString()}
</p>

<h2 className="text-xl font-semibold text-blue-700">
  Wants: {item.want_name} ({item.want_quantity})
</h2>
<p className="text-gray-700">Category: {item.want_category}</p>
<p className="text-gray-700"> {item.want_owner}</p>

              {/* Status display */}
              {item.status === "matched" && (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-green-100 text-green-700">
                  Matched with{" "}
                  {history.find((o) => o.id === item.matched_with)?.have_item
                    ?.owner || "another user"}
                </span>
              )}

              {/* Delete button */}
<button
  onClick={async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:8000/offers/history/${item.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((o) => o.id !== item.id)); // ✅ remove from UI
        alert("Offer deleted successfully!");
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to delete offer");
      }
    } catch (err) {
      console.error("❌ Error deleting offer:", err);
      alert("Could not delete offer. Please try again.");
    }
  }}
  className="mt-4 px-3 py-1 bg-white text-red-600 border border-gray-300 rounded hover:bg-gray-100"
>
  Delete
</button>

              {item.status === "completed" && (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700">
                  Completed Swap
                </span>
              )}
              {item.status === "expired" && (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-red-100 text-red-700">
                  Expired Swap
                </span>
              )}
              {item.status === "declined" && (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-red-200 text-red-800">
                  Declined Offer
                </span>
              )}
              {item.status === "pending" && (
                <span className="mt-4 inline-block px-3 py-1 rounded text-sm font-medium bg-yellow-100 text-yellow-700">
                  Pending Offer
                </span>
              )}
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
