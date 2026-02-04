"use client";

import { useState, useEffect } from "react";   // ✅ include useEffect here
import ChatBox from "./ChatBox";

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
  status: "pending" | "matched" | "completed" | "declined" | string;
  timestamp: string;
  matched_with?: string | null;
};

type Props = {
  offer: Offer;
  matchedOffer: Offer | null;
  currentUser: string;
  onClose: () => void;
  onStatusChange?: (newStatus: string) => void; // ✅ new prop
};

export default function SwapDetailsModal({
  offer,
  matchedOffer,
  currentUser,
  onClose,
  onStatusChange,   // ✅ include it here
}: Props) {
  // UI state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");

  // Status state
  const [swapStatus, setSwapStatus] = useState<Offer["status"]>(
    offer.status === "completed" ? "completed" : offer.status
  );
  // ✅ Keep modal in sync with parent updates
  useEffect(() => {
    setSwapStatus(offer.status);
  }, [offer.status]);

  // After fetching offer status or when swapStatus changes
  const isCompleted = swapStatus === "completed";
  const isMatched = offer.status === "matched" && matchedOffer?.status === "matched";
  const isCreator = currentUser === offer.have_owner;
  const isResponder = currentUser === matchedOffer?.have_owner;

  // ✅ Decide which side is "Your offer" based on logged-in user
  const isCurrentUserLeft = currentUser === offer.have_owner;
  const leftData = isCurrentUserLeft ? offer : matchedOffer;
  const rightData = isCurrentUserLeft ? matchedOffer : offer;

  // Badge helper
  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700 border-gray-300",
      matched: "bg-blue-100 text-blue-700 border-blue-300",
      completed: "bg-green-100 text-green-700 border-green-300",
      declined: "bg-red-100 text-red-700 border-red-300",
    };
    const cls = map[status] ?? "bg-gray-100 text-gray-700 border-gray-300";
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-xs ${cls}`}>
        {status === "completed" ? "✅" : status === "matched" ? "🔗" : status === "declined" ? "✖️" : "⏳"} {status}
      </span>
    );
  };

  // Actions
  const handleComplete = async () => {
  if (!confirmationCode) {
    alert("Please enter confirmation code from the other user");
    return;
  }
  try {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `http://localhost:8000/offers/${offer.id}/confirm-code?code=${confirmationCode}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  // First check if response is OK
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    alert(errorData.detail || "Wrong code, please try again.");
    return; // ✅ stop here
  }

  // Only parse JSON once for success
  const data = await res.json();

  setSwapStatus("completed");
  alert(data.message); // "Swap confirmed!"

  if (onStatusChange) {
    onStatusChange("completed"); // notify parent
  }

  // ✅ return here so catch won't run
  return;
} catch (err) {
  console.error("Error completing swap:", err);
  alert("Could not complete swap. Please try again.");
}

};

const handleDecline = async () => {
  const confirmDecline = window.confirm(
    "Are you sure you want to decline this swap? Once declined, it will return to the pool."
  );

  if (!confirmDecline) {
    // User canceled → stay in modal
    return;
  }

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`http://localhost:8000/offers/${offer.id}/decline-swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // ✅ Parse JSON once
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(result.detail || "Failed to decline swap");
    }

    // ✅ Show success message
    alert(result.message || "Swap declined and returned to the pool");

    // ✅ Update state
    setSwapStatus("pending"); // card goes back to pool
    onStatusChange?.("pending");

    // ✅ Close modal automatically
    onClose?.();

  } catch (err) {
    console.error("❌ Error declining swap:", err);
    alert("Could not decline swap. Please try again.");
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h1 className="text-2xl font-bold mb-4 text-green-600 text-center">
          Swap deal details
        </h1>

        {isCompleted && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
            ✅ Swap completed successfully! Both parties have finalized this trade.
          </div>
        )}

        {/* Offer cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Your offer */}
          {leftData && (
            <div className="border rounded p-4">
              <div className="flex justify-between mb-2">
                <h3 className="text-xl font-bold text-green-600">Your offer</h3>
                <StatusBadge status={swapStatus} />
              </div>
              <p><strong>Have:</strong> {leftData.have_name} ({leftData.have_quantity})</p>
              <p><strong>Want:</strong> {leftData.want_name} ({leftData.want_quantity})</p>
              <p><strong>Owner:</strong> {leftData.have_owner} {isCompleted && "✅"}</p>
              <p><strong>Location:</strong> {leftData.location}</p>
              <p><strong>Message:</strong> {leftData.message}</p>
              <p><strong>Status:</strong> {swapStatus}</p>
              <p><strong>Sent:</strong> {new Date(leftData.timestamp).toLocaleString()}</p>
            </div>
          )}

          {/* Right: Matched offer */}
          {rightData && (
            <div className="border rounded p-4">
              <div className="flex justify-between mb-2">
                <h3 className="text-xl font-bold text-blue-600">Matched with</h3>
                <StatusBadge status={swapStatus} />
              </div>
              <p><strong>Have:</strong> {rightData.have_name} ({rightData.have_quantity})</p>
              <p><strong>Want:</strong> {rightData.want_name} ({rightData.want_quantity})</p>
              <p><strong>Owner:</strong> {rightData.have_owner} {isCompleted && "✅"}</p>
              <p><strong>Location:</strong> {rightData.location}</p>
              <p><strong>Message:</strong> {rightData.message}</p>
              <p><strong>Status:</strong> {swapStatus}</p>
              <p><strong>Sent:</strong> {new Date(rightData.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Negotiation + Finalize side by side */}
{isMatched && !isCompleted && (
  <div className="mt-6 border-t pt-4">
    <h3 className="text-lg font-semibold mb-4">Negotiation & Finalize</h3>
    <div className="grid md:grid-cols-2 gap-6">
      {/* Chat Section */}
      <div className="border rounded p-4">
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Contact / Negotiate
          </button>
        ) : (
          <div>
            <h4 className="text-md font-semibold mb-2">Negotiation Chat</h4>
            {/* ✅ Let ChatBox handle input + messages */}
            <ChatBox offerId={offer.id} currentUser={currentUser} />
          </div>
        )}
      </div>

      {/* Finalize Swap Section */}
      <div className="border rounded p-4">
        <h4 className="text-md font-semibold mb-2">Finalize Swap</h4>
        {/* ⬇️ Your existing creator/responder logic stays untouched */}
        {isMatched ? (
          isCreator ? (
            // Creator: Enter code
            <div>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="Enter confirmation code"
                className="border rounded px-2 py-1 w-full mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleComplete}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Complete
                </button>
                <button
                  onClick={handleDecline}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Decline
                </button>
              </div>
            </div>
          ) : isResponder ? (
            // Responder: Generate code
            <div>
            <button
onClick={async () => {
  try {
    const res = await fetch(`/api/offers/${offer.id}/generate-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    // ✅ use the actual field name from backend
    setConfirmationCode(data.confirmation_code);
  } catch (err) {
    console.error("Error generating code:", err);
    alert("Could not generate code. Please try again.");
  }
}}
className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
>
Generate Code
</button>

{confirmationCode && (
<p className="mt-2 text-gray-700">
  Share this code with the other user: <strong>{confirmationCode}</strong>
</p>
)}

              <button
                onClick={handleDecline}
                className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Decline
              </button>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              You are not authorized to finalize this swap.
            </p>
          )
        ) : null}
      </div>
    </div>
  </div>
)}

{isCompleted && (
  <div className="mt-6 border-t pt-4 text-sm text-gray-700">
    This swap has been finalized. Chat and actions are disabled.
  </div>
)}

<button
  onClick={onClose}
  className="mt-6 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
>
  Close
</button>
  </div>
  </div>
  );
  }
