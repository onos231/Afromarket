"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      let data;
      if (res.headers.get("content-type")?.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        setMessage(`Server error: ${text}`);
        setLoading(false);
        return;
      }

      setLoading(false);

      if (res.ok) {
        if (mode === "signup") {
          setMessage("Signup successful! You can now log in.");
          setMode("login");
        } else {
          // ✅ Save the JWT token returned by FastAPI
          localStorage.setItem("token", data.access_token);

          // ✅ Save the username separately for owner tracking
          localStorage.setItem("afromarket_owner", data.username);
          window.dispatchEvent(new Event("afromarket-login"));

          setMessage("Login successful! Redirecting...");
          router.push("/deals");
        }
      } else {
        // ✅ Ensure we only set a string message
        if (typeof data.detail === "string") {
          setMessage(data.detail);
        } else if (Array.isArray(data.detail)) {
          setMessage(data.detail[0].msg || "Validation error");
        } else {
          setMessage("Something went wrong");
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("Unable to reach server. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>{mode === "signup" ? "Sign Up" : "Log In"}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
          required
        />
        <button type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Please wait..." : mode === "signup" ? "Sign Up" : "Log In"}
        </button>
      </form>
      {message && <p style={{ marginTop: 10 }}>{message}</p>}
      <button onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
        Switch to {mode === "signup" ? "Log In" : "Sign Up"}
      </button>
    </div>
  );
}
