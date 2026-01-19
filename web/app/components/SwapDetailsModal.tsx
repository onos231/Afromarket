"use client";

import { useState } from "react";

type Offer = {
  id: string;
  have_name: string;
  have_quantity: string;
  have_owner: string;
  want_name: string;
  want_quantity: string;
  want_owner: string;
  location: string;
  message: string;
  status: "pending" | "matched" | string;
  timestamp: string;
  matched_with?: string | null;
};

export default function SwapDetailsModal({
  offer,
  matchedOffer,
  currentUser,
  onClose,
}: {
  offer: Offer;
  matchedOffer: Offer | null;
  currentUser: string;
  onClose: () => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = () => {
    if (chatInput.trim() === "") return;
    setChatMessages((prev) => [...prev, chatInput]);
    setChatInput("");
  };

  // Left is always the clicked offer; right is the matched offer only if truly matched
  const left = offer;
  const isMatched =
    matchedOffer &&
    (offer.status === "matched" || matchedOffer.status === "matched");
  const right = isMatched ? matchedOffer : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h1 className="text-2xl font-bold mb-6 text-green-600 text-center">
          Swap deal details
        </h1>

        <div className={`grid gap-6 ${right ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {/* Left side: always the clicked offer */}
          <div className="border rounded p-4">
            <h3 className="text-xl font-bold mb-4 text-green-600">Your offer</h3>
            <p><strong>Have:</strong> {left.have_name} ({left.have_quantity})</p>
            <p><strong>Want:</strong> {left.want_name} ({left.want_quantity})</p>
            <p><strong>Owner:</strong> {left.have_owner}</p>
            <p><strong>Location:</strong> {left.location}</p>
            <p><strong>Message:</strong> {left.message}</p>
            <p><strong>Status:</strong> {left.status}</p>
            <p><strong>Sent:</strong> {new Date(left.timestamp).toLocaleString()}</p>
          </div>

          {/* Right side: only if matched */}
          {right ? (
            <div className="border rounded p-4">
              <h3 className="text-xl font-bold mb-4 text-blue-600">Matched with</h3>
              <p><strong>Have:</strong> {right.have_name} ({right.have_quantity})</p>
              <p><strong>Want:</strong> {right.want_name} ({right.want_quantity})</p>
              <p><strong>Owner:</strong> {right.have_owner}</p>
              <p><strong>Location:</strong> {right.location}</p>
              <p><strong>Message:</strong> {right.message}</p>
              <p><strong>Status:</strong> {right.status}</p>
              <p><strong>Sent:</strong> {new Date(right.timestamp).toLocaleString()}</p>

              {!chatOpen ? (
                <button
                  onClick={() => setChatOpen(true)}
                  className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Contact / Negotiate
                </button>
              ) : (
                <div className="mt-4 border-t pt-4">
                  <h3 className="text-lg font-semibold mb-2">Negotiation Chat</h3>
                  <div className="h-32 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
                    {chatMessages.length === 0 ? (
                      <p className="text-gray-500 text-sm">No messages yet.</p>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <p key={idx} className="text-sm text-gray-800 mb-1">
                          You: {msg}
                        </p>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 border rounded p-2 text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded p-4">
              <h3 className="text-xl font-bold mb-4 text-blue-600">Match status</h3>
              <p className="text-gray-700">
                No confirmed match yet. You’ll see the counterparty’s details here once a match is made.
              </p>
            </div>
          )}
        </div>

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
