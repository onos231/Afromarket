"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

type TokenPayload = {
  sub: string;
  exp: number;
};

export default function Header() {
  const [owner, setOwner] = useState<string | null>(null);
  const router = useRouter();

  // Function to decode token and update owner
  const updateOwnerFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setOwner(null);
      return;
    }

    try {
      const decoded: TokenPayload = jwtDecode(token);
      const normalizedOwner =
        decoded.sub && decoded.sub !== "undefined" && decoded.sub !== "null"
          ? decoded.sub
          : null;
      setOwner(normalizedOwner);
    } catch (err) {
      console.error("Invalid token in header", err);
      setOwner(null);
    }
  };

  useEffect(() => {
    // Run once on mount
    updateOwnerFromToken();

    // ✅ Listen for custom login event
    const handleLogin = () => updateOwnerFromToken();
    window.addEventListener("afromarket-login", handleLogin);

    return () => {
      window.removeEventListener("afromarket-login", handleLogin);
    };
  }, []);

  return (
    <nav className="flex justify-between items-center p-4 bg-white shadow">
      {/* 🔰 Left side: Logo + Nav */}
      <div className="flex items-center space-x-6">
        <span className="text-green-600 font-bold text-xl">Afromark</span>
        <a href="/" className="hover:text-green-600">Home</a>
        <a href="/swap" className="hover:text-green-600">Swap</a>
        <a href="/deals" className="hover:text-green-600">Deals</a>
        <a href="/history" className="hover:text-green-600">History</a>
      </div>

      {/* 🙋‍♂️ Right side: Welcome + Logout/Login */}
      <div>
        {owner ? (
          <>
            <span className="mr-4">Welcome, {owner}</span>
            <button
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("afromarket_owner");
                setOwner(null);
                router.push("/auth");
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <a href="/auth" className="text-green-600 font-semibold">Login</a>
        )}
      </div>
    </nav>
  );
}
