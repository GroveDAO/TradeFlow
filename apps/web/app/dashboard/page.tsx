import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          TradeFlow
        </Link>
        <div className="flex gap-6 text-sm font-medium text-gray-600">
          <Link href="/dashboard" className="text-blue-600">
            Dashboard
          </Link>
          <Link href="/dashboard/invoices" className="hover:text-blue-600">
            Invoices
          </Link>
          <Link href="/dashboard/lend" className="hover:text-blue-600">
            Lend
          </Link>
          <Link href="/dashboard/portfolio" className="hover:text-blue-600">
            Portfolio
          </Link>
          <Link href="/explore" className="hover:text-blue-600">
            Explore
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-500">Total Invoices</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-500">Outstanding Advances</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">—</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm text-gray-500">Vault APY</p>
            <p className="text-3xl font-bold text-green-600 mt-1">—%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/invoices/upload"
                className="flex items-center gap-3 rounded-lg border border-blue-200 p-3 hover:bg-blue-50 transition-colors"
              >
                <span className="text-xl">📄</span>
                <div>
                  <p className="font-medium text-gray-900">Upload Invoice</p>
                  <p className="text-sm text-gray-500">
                    Mint NFT and get AI risk score
                  </p>
                </div>
              </Link>
              <Link
                href="/dashboard/lend"
                className="flex items-center gap-3 rounded-lg border border-green-200 p-3 hover:bg-green-50 transition-colors"
              >
                <span className="text-xl">💰</span>
                <div>
                  <p className="font-medium text-gray-900">Deposit to Vault</p>
                  <p className="text-sm text-gray-500">
                    Earn yield from Bonzo Finance
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <p className="text-gray-500 text-sm">No recent activity yet.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
