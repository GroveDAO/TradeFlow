"use client";

import { useEffect, useState } from "react";

interface VaultStats {
  apyPercent: string;
  liquidityIndex: string;
  totalDeposited: number;
}

interface Props {
  onDeposit?: (amount: number) => void;
  onWithdraw?: (amount: number) => void;
}

export default function LendingPool({ onDeposit, onWithdraw }: Props) {
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

    const token =
      typeof window !== "undefined" ? localStorage.getItem("tf_token") : null;
    const n = Number(amount);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lenders/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ amount: n }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        if (action === "deposit") onDeposit?.(n);
        else onWithdraw?.(n);
      } else {
        setMessage(data.error || "Error");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Bonzo Finance Vault
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <p className="text-xs text-gray-500">APY</p>
          <p className="text-xl font-bold text-green-600">
            {stats?.apyPercent ?? "—"}%
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-xs text-gray-500">TVL</p>
          <p className="text-xl font-bold text-blue-600">
            {stats ? `$${stats.totalDeposited.toLocaleString()}` : "—"}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAction("deposit")}
          className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors ${
            action === "deposit"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setAction("withdraw")}
          className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors ${
            action === "withdraw"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          Withdraw
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="1"
          placeholder="Amount USDC-H"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {message && (
          <p className="text-xs text-blue-700 text-center">{message}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Processing…" : action === "deposit" ? "Deposit" : "Withdraw"}
        </button>
      </form>
    </div>
  );
}
