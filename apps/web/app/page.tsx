import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="max-w-3xl text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          TradeFlow
        </h1>
        <p className="text-2xl text-blue-600 font-semibold mb-6">
          SMEs get paid in hours, not 90 days
        </p>
        <p className="text-lg text-gray-600 mb-8">
          Invoice factoring on Hedera — mint NFTs, get advances, build
          reputation. Powered by HTS, HCS, Bonzo Finance, and SupraOracles.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/explore"
            className="rounded-lg border border-blue-600 px-6 py-3 text-blue-600 font-semibold hover:bg-blue-50 transition-colors"
          >
            Explore Marketplace
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div className="p-4 rounded-xl bg-white shadow-sm border">
            <div className="text-3xl font-bold text-blue-600">$0.0001</div>
            <div className="text-sm text-gray-600 mt-1">per transaction on Hedera</div>
          </div>
          <div className="p-4 rounded-xl bg-white shadow-sm border">
            <div className="text-3xl font-bold text-green-600">~20 min</div>
            <div className="text-sm text-gray-600 mt-1">to get paid vs 90 days</div>
          </div>
          <div className="p-4 rounded-xl bg-white shadow-sm border">
            <div className="text-3xl font-bold text-purple-600">6–8%</div>
            <div className="text-sm text-gray-600 mt-1">APY for LPs in Bonzo vault</div>
          </div>
        </div>
      </div>
    </main>
  );
}
