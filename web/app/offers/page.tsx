"use client";
import { useState } from "react";


export default function CreateOfferPage() {
  const [haveName, setHaveName] = useState("");
  const [haveQuantity, setHaveQuantity] = useState("");
  const [haveCategory, setHaveCategory] = useState("");
  const [wantName, setWantName] = useState("");
  const [wantQuantity, setWantQuantity] = useState("");
  const [wantCategory, setWantCategory] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to create an offer");
      return;
    }

    const res = await fetch("http://localhost:8000/offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ send token
      },
      body: JSON.stringify({
        have_item: { name: haveName, quantity: haveQuantity, category: haveCategory },
        want_item: { name: wantName, quantity: wantQuantity, category: wantCategory },
        location,
        message,
      }),
    });

    const data = await res.json();
    alert(JSON.stringify(data));
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
    </div>
  );
}
