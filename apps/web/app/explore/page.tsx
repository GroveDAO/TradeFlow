"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InvoiceCard from "../../components/InvoiceCard";
import type { InvoiceDTO } from "@tradeflow/shared";

export default function ExplorePage() {
  const [invoices, setInvoices] = useState<InvoiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/explore`)
      .then((r) => r.json())
      .then((d) => setInvoices(d.invoices ?? []))
      .finally(() => setLoading(false));
  }, []);

  const tiers = ["ALL", "AAA", "AA", "A", "BBB", "BB", "B", "CCC"];
  const filtered =
    filter === "ALL" ? invoices : invoices.filter((i) => i.riskTier === filter);

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
          <Link href="/explore" className="text-blue-600">
            Explore
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Invoice Marketplace
          </h1>
          <p className="text-sm text-gray-500">
            {filtered.length} invoice{filtered.length !== 1 ? "s" : ""} available
          </p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tiers.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                filter === t
                  ? "bg-blue-600 text-white"
                  : "bg-white border text-gray-600 hover:bg-blue-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No invoices match your filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((inv) => (
              <InvoiceCard key={inv.id} invoice={inv} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
