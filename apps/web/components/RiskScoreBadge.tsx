import type { RiskTier } from "@tradeflow/shared";

interface Props {
  tier: RiskTier;
  score?: number | null;
}

const tierColors: Record<RiskTier, { bg: string; text: string; label: string }> = {
  AAA: { bg: "bg-emerald-100", text: "text-emerald-800", label: "AAA" },
  AA: { bg: "bg-green-100", text: "text-green-800", label: "AA" },
  A: { bg: "bg-lime-100", text: "text-lime-800", label: "A" },
  BBB: { bg: "bg-yellow-100", text: "text-yellow-800", label: "BBB" },
  BB: { bg: "bg-orange-100", text: "text-orange-800", label: "BB" },
  B: { bg: "bg-red-100", text: "text-red-700", label: "B" },
  CCC: { bg: "bg-red-200", text: "text-red-900", label: "CCC" },
};

export default function RiskScoreBadge({ tier, score }: Props) {
  const colors = tierColors[tier] ?? {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: tier,
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg}`}
    >
      <span className={`text-xs font-bold ${colors.text}`}>
        {colors.label}
      </span>
      {score != null && (
        <span className={`text-xs ${colors.text} opacity-75`}>
          {score.toFixed(0)}/100
        </span>
      )}
    </div>
  );
}
