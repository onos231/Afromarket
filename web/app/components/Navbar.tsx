"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getUsernameFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setUsername(getUsernameFromToken(token));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUsername(null);
    router.push("/auth");
  };

  return (
    <nav style={{ background: "green", padding: "10px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <Link href="/" style={{ marginRight: 10 }}>Home</Link>
        <Link href="/swap" style={{ marginRight: 10 }}>Swap</Link>
        <Link href="/deals" style={{ marginRight: 10 }}>Deals</Link>
        <Link href="/history" style={{ marginRight: 10 }}>History</Link>
      </div>
      <div>
        {username ? (
          <>
            Welcome, <strong>{username}</strong> |{" "}
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                color: "white",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/auth">Login</Link>
        )}
      </div>
    </nav>
  );
}
