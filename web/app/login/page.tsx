"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem("afromarket_owner");
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (username.trim() !== "") {
      localStorage.setItem("afromarket_owner", username);
      // 🔥 Dispatch custom event so Header updates immediately
      window.dispatchEvent(new Event("afromarket_login"));
      alert(`Welcome, ${username}!`);
      router.push("/"); // redirect to home
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
    
      <h1 className="text-3xl font-bold text-green-600 text-center">Login</h1>

      <form
        onSubmit={handleLogin}
        className="mt-8 max-w-md mx-auto bg-white p-6 rounded-lg shadow-md"
      >
        <label className="block text-sm font-medium text-gray-700">
          Enter your name
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 p-2 border rounded w-full"
          required
        />

        <button
          type="submit"
          className="mt-6 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Login
        </button>
      </form>
    </main>
  );
}
