"use client";

import Link from "next/link";
import { useCart } from "../cart/CartContext";

export default function Header() {
  const { items, total } = useCart();
  const count = items.reduce((n, i) => n + i.qty, 0);

  return (
    <header className="flex justify-between items-center p-4 bg-white shadow">
      {/* Logo / Home link */}
      <Link href="/" className="text-2xl font-bold text-green-600">
        Afromarket
      </Link>

      {/* Cart badge */}
      <Link href="/cart" className="flex items-center gap-3">
        <span className="text-gray-700">Cart</span>
        <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">
          {count}
        </span>
        <span className="text-gray-700">${total.toFixed(2)}</span>
      </Link>
    </header>
  );
}
