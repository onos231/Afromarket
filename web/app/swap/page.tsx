"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "../components/AuthGuard";

export default function SwapPage() {
  const [haveItem, setHaveItem] = useState("");
  const [wantItem, setWantItem] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [owner, setOwner] = useState("");

  const searchParams = useSearchParams();

  useEffect(() => {
    const rawOwner = localStorage.getItem("afromarket_owner");
    const normalizedOwner =
      rawOwner && rawOwner !== "undefined" && rawOwner !== "null" ? rawOwner : "";
    setOwner(normalizedOwner);

    const wantId = searchParams.get("want");
    if (wantId) setWantItem(wantId);
  }, [searchParams]);

  useEffect(() => {
    if (owner.trim() !== "" && owner !== "undefined" && owner !== "null") {
      localStorage.setItem("afromarket_owner", owner);
    }
  }, [owner]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const raw = owner || localStorage.getItem("afromarket_owner") || "";
    const currentOwner =
      raw && raw !== "undefined" && raw !== "null" ? raw : "";

    const newOffer = {
      have_item: {
        name: haveItem,
        quantity: "1",
        category: "Roots",
        image: image || null,
        owner: currentOwner,
      },
      want_item: {
        name: wantItem,
        quantity: "1",
        category: "Roots",
        owner: currentOwner,
      },
      location,
      message,
    };

    console.log("Submitting offer:", newOffer);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:8000/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(newOffer),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      alert("Swap offer submitted!");
      console.log("Offer created:", data);
    } catch (err) {
      console.error("Error submitting offer:", err);
      alert("Failed to create swap offer.");
    }
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold text-green-600 text-center">
          Create Swap Offer
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-8 max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md"
        >
          <label className="block text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
            placeholder="Enter your username"
            required
          />

          <label className="block text-sm font-medium text-gray-700 mt-4">
            Have Item
          </label>
          <input
            type="text"
            value={haveItem}
            onChange={(e) => setHaveItem(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
            required
          />

          <label className="block text-sm font-medium text-gray-700 mt-4">
            Want Item
          </label>
          <input
            type="text"
            value={wantItem}
            onChange={(e) => setWantItem(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
            required
          />

          <label className="block text-sm font-medium text-gray-700 mt-4">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
            required
          />

          <label className="block text-sm font-medium text-gray-700 mt-4">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
          />

          <label className="block text-sm font-medium text-gray-700 mt-4">
            Image URL
          </label>
          <input
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="Paste an image link"
            className="mt-1 p-2 border rounded w-full"
          />

          <button
            type="submit"
            className="mt-6 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Submit Swap Offer
          </button>
        </form>
      </main>
    </AuthGuard>
  );
}
