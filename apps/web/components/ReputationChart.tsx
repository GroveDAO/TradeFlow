"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ReputationEvent } from "@tradeflow/shared";

interface Props {
  events: ReputationEvent[];
  debtorName: string;
}

interface ChartPoint {
  seq: number;
  score: number;
  event: string;
  amount: number;
}

const eventScoreImpact: Record<string, number> = {
  ISSUED: 0,
  PAID_ON_TIME: 2,
  PAID_LATE: -5,
  DEFAULTED: -15,
};

export default function ReputationChart({ events, debtorName }: Props) {
  let score = 50;
  const data: ChartPoint[] = events.map((ev, idx) => {
    score = Math.min(100, Math.max(0, score + (eventScoreImpact[ev.event] ?? 0)));
    return {
      seq: ev.seq ?? idx + 1,
      score,
      event: ev.event,
      amount: ev.invoiceAmount,
    };
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No reputation history yet for {debtorName}
      </div>
    );
  }

  const eventColor = (event: string) => {
    if (event === "PAID_ON_TIME") return "#16a34a";
    if (event === "PAID_LATE") return "#ea580c";
    if (event === "DEFAULTED") return "#dc2626";
    return "#6b7280";
  };

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Reputation History — {debtorName}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="seq"
            tick={{ fontSize: 11 }}
            label={{ value: "Event #", position: "insideBottomRight", offset: -5, fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            label={{ value: "Score", angle: -90, position: "insideLeft", fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as ChartPoint;
                return (
                  <div className="bg-white border rounded shadow-sm p-2 text-xs">
                    <p className="font-semibold" style={{ color: eventColor(d.event) }}>
                      {d.event}
                    </p>
                    <p>Score: {d.score}</p>
                    <p>Amount: ${d.amount.toLocaleString()}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#2563eb"
            strokeWidth={2}
            dot={(props) => {
              const d = props.payload as ChartPoint;
              return (
                <circle
                  key={`dot-${props.index}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill={eventColor(d.event)}
                  stroke="white"
                  strokeWidth={1}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
          On Time
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
          Late
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
          Default
        </span>
      </div>
    </div>
  );
}
