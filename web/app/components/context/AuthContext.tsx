"use client";
import { createContext, useContext, useState, useEffect } from "react";

type AuthContextType = {
  owner: string | null;
  setOwner: (owner: string | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  owner: null,
  setOwner: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("afromarket_owner");
    if (stored && stored !== "undefined" && stored !== "null") {
      setOwner(stored);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ owner, setOwner }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ This is the missing export
export function useAuth() {
  return useContext(AuthContext);
}
