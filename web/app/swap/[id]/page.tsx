"use client";

import { useState } from "react";
import ChatBox from "../../components/ChatBox";

export default function SwapDealPage({ params }: { params: { id: string } }) {
  const dealId = params.id;
  const [confirmationCode, setConfirmationCode] = useState("");

  // --- Handlers for finalize swap actions ---
  const handleGenerateCode = async (offerId: string) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`http://localhost:8000/offers/${offerId}/generate-code`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });
  const data = await res.json();

  // ✅ Use the actual field names from backend
  console.log("Generated code response:", data);
  alert(`Confirmation Code: ${data.confirmation_code}\nCompletion Code: ${data.completion_code}`);
};

const [confirmationCodeGenerated, setConfirmationCodeGenerated] = useState("");

const handleGenerateCode = async (offerId: string) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`http://localhost:8000/offers/${offerId}/generate-code`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });
  const data = await res.json();
  setConfirmationCodeGenerated(data.confirmation_code);
};


{confirmationCodeGenerated && (
  <p className="mt-4 text-green-700">Generated Confirmation Code: {confirmationCodeGenerated}</p>
)}


const handleConfirmCode = async (offerId: string, code: string) => {
const token = localStorage.getItem("token");
try {
  const res = await fetch(`http://localhost:8000/offers/${offerId}/confirm-code?code=${code}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Error: ${res.status}`);
  }

  const data = await res.json();
  alert(data.message); // ✅ "Swap confirmed!"
} catch (err) {
  console.error("Error confirming swap:", err);
  alert("Could not complete swap. Please try again.");
}
};

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">Swap deal details</h1>
      {/* Existing deal details UI here */}

      {/* Negotiation Chat */}
      <ChatBox dealId={dealId} />

      {/* ✅ Finalize Swap Section */}
      <div className="mt-8 bg-white p-6 rounded shadow-md">
        <h2 className="text-lg font-bold mb-4">Finalize Swap</h2>

        <button
  onClick={() => {
    console.log("Clicked Generate Code", dealId);
    handleGenerateCode(dealId);
  }}
  className="bg-purple-600 text-white px-4 py-2 rounded mr-2"
>
  Generate Code
</button>


        <input
          type="text"
          value={confirmationCode}
          onChange={(e) => setConfirmationCode(e.target.value)}
          placeholder="Enter confirmation code"
          className="border p-2 rounded mr-2"
        />

        <button
          onClick={() => handleConfirmCode(dealId, confirmationCode)}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
        >
          Complete
        </button>

        <button
          onClick={() => handleDeclineSwap(dealId)}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Decline
        </button>
      </div>
    </main>
  );
}
