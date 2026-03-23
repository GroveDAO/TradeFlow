"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface VaultStats {
  apyPercent: string;
  liquidityIndex: string;
  totalDeposited: number;
}

export default function LendPage() {
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [amount, setAmount] = useState("");
  const [action, setAction] = useState<"deposit" | "withdraw">("deposit");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lenders/stats`)
      .then((r) => r.json())
      .then((d) => setStats({ ...d.vaultStats, totalDeposited: d.totalDeposited }))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const token = localStorage.getItem("tf_token");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lenders/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ amount: Number(amount) }),
        }
      );
      const data = await res.json();
      setMessage(data.message || (res.ok ? "Success" : data.error));
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          TradeFlow
        </Link>
        <div className="flex gap-6 text-sm font-medium text-gray-600">
          <Link href="/dashboard" className="hover:text-blue-600">
            Dashboard
          </Link>
          <Link href="/dashboard/lend" className="text-blue-600">
            Lend
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Lending Pool
        </h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-sm text-gray-500">Vault APY</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats?.apyPercent ?? "—"}%
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-sm text-gray-500">Total Deposited</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {stats ? `$${stats.totalDeposited.toLocaleString()}` : "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <p className="text-sm text-gray-500">Protocol</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">Bonzo</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setAction("deposit")}
              className={`flex-1 rounded-lg py-2 font-semibold transition-colors ${
                action === "deposit"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setAction("withdraw")}
              className={`flex-1 rounded-lg py-2 font-semibold transition-colors ${
                action === "withdraw"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Withdraw
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (USDC-H)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000"
              />
            </div>

            {message && (
              <p className="text-sm font-medium text-center text-blue-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Processing…"
                : action === "deposit"
                ? "Deposit to Bonzo Vault"
                : "Withdraw from Vault"}
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Powered by Bonzo Finance on Hedera EVM. Funds are deployed in the
          USDC-H lending pool.
        </p>
      </main>
    </div>
  );
}
