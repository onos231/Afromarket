"use client";
import { useState } from "react";

export default function OffersPage() {
  const [haveName, setHaveName] = useState("");
  const [haveQuantity, setHaveQuantity] = useState("");
  const [haveCategory, setHaveCategory] = useState("");
  const [wantName, setWantName] = useState("");
  const [wantQuantity, setWantQuantity] = useState("");
  const [wantCategory, setWantCategory] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  const [offerId, setOfferId] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to create an offer");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          have_item: { name: haveName, quantity: haveQuantity, category: haveCategory },
          want_item: { name: wantName, quantity: wantQuantity, category: wantCategory },
          location,
          message,
        }),
      });

      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const data = await res.json();
      setOfferId(data.id); // ✅ store the new offer ID
      alert(`Offer created with ID: ${data.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create offer");
    }
  };

  const handleGenerateCode = async () => {
    if (!offerId) {
      alert("No offer created yet");
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/offers/${offerId}/generate-code`, {
        method: "POST",
      });

      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const data = await res.json();
      setConfirmationCode(data.confirmation_code);
    } catch (err) {
      console.error(err);
      alert("Failed to generate code");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4 text-green-600">Create Offer</h1>

      <input placeholder="Have Item Name" value={haveName} onChange={(e) => setHaveName(e.target.value)} className="w-full border p-2 mb-2 rounded" />
      <input placeholder="Have Quantity" value={haveQuantity} onChange={(e) => setHaveQuantity(e.target.value)} className="w-full border p-2 mb-2 rounded" />
      <input placeholder="Have Category" value={haveCategory} onChange={(e) => setHaveCategory(e.target.value)} className="w-full border p-2 mb-2 rounded" />

      <input placeholder="Want Item Name" value={wantName} onChange={(e) => setWantName(e.target.value)} className="w-full border p-2 mb-2 rounded" />
      <input placeholder="Want Quantity" value={wantQuantity} onChange={(e) => setWantQuantity(e.target.value)} className="w-full border p-2 mb-2 rounded" />
      <input placeholder="Want Category" value={wantCategory} onChange={(e) => setWantCategory(e.target.value)} className="w-full border p-2 mb-2 rounded" />

      <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border p-2 mb-2 rounded" />
      <textarea placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} className="w-full border p-2 mb-4 rounded" />

      <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
        Submit Offer
      </button>

      {offerId && (
        <div className="mt-4">
          <p className="text-sm text-gray-700">Offer ID: {offerId}</p>
          <button onClick={handleGenerateCode} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mt-2">
            Generate Code
          </button>
        </div>
      )}

      {confirmationCode && (
        <div className="mt-4 p-2 border rounded bg-gray-100">
          <p className="text-sm font-bold">Confirmation Code:</p>
          <p className="text-lg text-green-700">{confirmationCode}</p>
        </div>
      )}
    </div>
  );
}
