"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Deposit {
  id: string;
  amount: number;
  currency: string;
  txId: string;
  withdrawn: boolean;
  createdAt: string;
}

export default function PortfolioPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tf_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lenders/my-deposits`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setDeposits(d.deposits ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totalActive = deposits
    .filter((d) => !d.withdrawn)
    .reduce((sum, d) => sum + d.amount, 0);

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
          <Link href="/dashboard/portfolio" className="text-blue-600">
            Portfolio
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          My Portfolio
        </h1>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-500">Active Deposits</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              ${totalActive.toLocaleString()} USDC-H
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-500">Total Positions</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {deposits.length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Date
                </th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Currency
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Tx ID
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No deposits yet.{" "}
                    <Link
                      href="/dashboard/lend"
                      className="text-blue-600 hover:underline"
                    >
                      Deposit to earn yield
                    </Link>
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${d.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.currency}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                          d.withdrawn
                            ? "bg-gray-100 text-gray-600"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {d.withdrawn ? "Withdrawn" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {d.txId.slice(0, 16)}…
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
