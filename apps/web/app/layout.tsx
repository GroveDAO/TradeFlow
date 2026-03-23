import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeFlow — Invoice Financing on Hedera",
  description:
    "SMEs get paid in hours, not 90 days — using their invoices as collateral on Hedera.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
