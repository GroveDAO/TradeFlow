import Link from "next/link";
import type { InvoiceDTO } from "@tradeflow/shared";
import RiskScoreBadge from "./RiskScoreBadge";

interface Props {
  invoice: InvoiceDTO;
  showActions?: boolean;
}

export default function InvoiceCard({ invoice, showActions = false }: Props) {
  const daysUntilDue = Math.ceil(
    (new Date(invoice.dueDate).getTime() - Date.now()) / 86400000
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 font-mono">
            {invoice.invoiceNumber}
          </p>
          <p className="font-semibold text-gray-900 mt-0.5">
            {invoice.debtorName}
          </p>
        </div>
        {invoice.riskTier && (
          <RiskScoreBadge tier={invoice.riskTier} score={invoice.riskScore} />
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Face Value</span>
          <span className="font-medium">
            ${invoice.amount.toLocaleString()} {invoice.currency}
          </span>
        </div>
        {invoice.advanceAmount && (
          <div className="flex justify-between">
            <span className="text-gray-500">Advance Available</span>
            <span className="font-medium text-green-600">
              ${invoice.advanceAmount.toFixed(2)}
            </span>
          </div>
        )}
        {invoice.advanceRate && (
          <div className="flex justify-between">
            <span className="text-gray-500">Advance Rate</span>
            <span className="font-medium">
              {(invoice.advanceRate * 100).toFixed(0)}%
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Due</span>
          <span
            className={`font-medium ${
              daysUntilDue < 7 ? "text-red-600" : "text-gray-700"
            }`}
          >
            {daysUntilDue > 0
              ? `${daysUntilDue} days`
              : `${Math.abs(daysUntilDue)} days overdue`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
              invoice.status === "ADVANCED"
                ? "bg-blue-100 text-blue-700"
                : invoice.status === "REPAID"
                ? "bg-green-100 text-green-700"
                : invoice.status === "SCORED"
                ? "bg-purple-100 text-purple-700"
                : invoice.status === "DEFAULTED"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {invoice.status}
          </span>
        </div>
      </div>

      {invoice.htsTokenId && (
        <a
          href={`https://hashscan.io/testnet/token/${invoice.htsTokenId}/${invoice.htsSerialNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-xs text-blue-500 hover:underline"
        >
          View NFT on HashScan ↗
        </a>
      )}

      {showActions && (
        <Link
          href={`/dashboard/invoices/${invoice.id}`}
          className="mt-4 block text-center text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Manage →
        </Link>
      )}
    </div>
  );
}
