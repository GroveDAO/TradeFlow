import Link from "next/link";

export default function InvoicesPage() {
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
          <Link href="/dashboard/invoices" className="text-blue-600">
            Invoices
          </Link>
          <Link href="/dashboard/lend" className="hover:text-blue-600">
            Lend
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
          <Link
            href="/dashboard/invoices/upload"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            + Upload Invoice
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Invoice #
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Debtor
                </th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Due Date
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">
                  Risk
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No invoices yet.{" "}
                  <Link
                    href="/dashboard/invoices/upload"
                    className="text-blue-600 hover:underline"
                  >
                    Upload your first invoice
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
