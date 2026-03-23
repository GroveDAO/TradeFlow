"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RiskScoreBadge from "../../../../components/RiskScoreBadge";
import type { InvoiceDTO } from "@tradeflow/shared";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<InvoiceDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("tf_token") : null;
  const headers = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${id}`, {
      headers,
    })
      .then((r) => r.json())
      .then((d) => setInvoice(d.invoice))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleScore() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${id}/score`,
        { method: "POST", headers }
      );
      const data = await res.json();
      setInvoice((prev) =>
        prev
          ? {
              ...prev,
              riskScore: data.assessment?.riskScore,
              riskTier: data.assessment?.riskTier,
              advanceRate: data.assessment?.advanceRate,
              advanceAmount: prev.amount * (data.assessment?.advanceRate ?? 0),
              status: "SCORED",
            }
          : prev
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdvance() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${id}/advance`,
        { method: "POST", headers }
      );
      const data = await res.json();
      alert(data.message);
      setInvoice((prev) => (prev ? { ...prev, status: "ADVANCED" } : prev));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRepay() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/invoices/${id}/repay`,
        { method: "POST", headers }
      );
      const data = await res.json();
      alert(data.message);
      setInvoice((prev) => (prev ? { ...prev, status: "REPAID" } : prev));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invoice not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4">
        <Link href="/" className="text-xl font-bold text-blue-600">
          TradeFlow
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Invoice {invoice.invoiceNumber}
          </h1>
          {invoice.riskTier && (
            <RiskScoreBadge tier={invoice.riskTier} score={invoice.riskScore} />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Debtor</p>
              <p className="font-medium">{invoice.debtorName}</p>
            </div>
            <div>
              <p className="text-gray-500">Amount</p>
              <p className="font-medium text-lg">
                ${invoice.amount.toLocaleString()} {invoice.currency}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Due Date</p>
              <p className="font-medium">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                  invoice.status === "ADVANCED"
                    ? "bg-blue-100 text-blue-700"
                    : invoice.status === "REPAID"
                    ? "bg-green-100 text-green-700"
                    : invoice.status === "SCORED"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {invoice.status}
              </span>
            </div>
            {invoice.advanceAmount && (
              <div>
                <p className="text-gray-500">Advance Amount</p>
                <p className="font-medium text-green-600">
                  ${invoice.advanceAmount.toFixed(2)}
                </p>
              </div>
            )}
            {invoice.htsTokenId && (
              <div>
                <p className="text-gray-500">HTS Token</p>
                <a
                  href={`https://hashscan.io/testnet/token/${invoice.htsTokenId}/${invoice.htsSerialNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View on HashScan ↗
                </a>
              </div>
            )}
            {invoice.ipfsHash && (
              <div>
                <p className="text-gray-500">IPFS</p>
                <a
                  href={`https://ipfs.io/ipfs/${invoice.ipfsHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View PDF ↗
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {invoice.status === "MINTED" && (
            <button
              onClick={handleScore}
              disabled={actionLoading}
              className="rounded-lg bg-purple-600 px-4 py-2 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {actionLoading ? "Scoring…" : "Get AI Risk Score"}
            </button>
          )}
          {invoice.status === "SCORED" && (
            <button
              onClick={handleAdvance}
              disabled={actionLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading
                ? "Requesting advance…"
                : `Request $${invoice.advanceAmount?.toFixed(2)} Advance`}
            </button>
          )}
          {invoice.status === "ADVANCED" && (
            <button
              onClick={handleRepay}
              disabled={actionLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? "Repaying…" : "Repay & Burn NFT"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
