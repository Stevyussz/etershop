/**
 * @file src/app/admin/MiniBarChart.tsx
 * @description Pure SVG bar chart client component for the admin dashboard.
 * Shows revenue data for the last 7 days using native SVG — no chart library needed.
 */

"use client";

interface ChartData {
  label: string;
  value: number;
}

export default function MiniBarChart({ data }: { data: ChartData[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const BAR_W = 28;
  const GAP = 8;
  const HEIGHT = 80;
  const totalW = data.length * (BAR_W + GAP) - GAP;

  return (
    <div className="mt-4 w-full">
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${HEIGHT + 20}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {data.map((d, i) => {
          const barH = Math.max(4, (d.value / max) * HEIGHT);
          const x = i * (BAR_W + GAP);
          const y = HEIGHT - barH;
          return (
            <g key={i}>
              {/* Background track */}
              <rect
                x={x}
                y={0}
                width={BAR_W}
                height={HEIGHT}
                rx={5}
                fill="rgba(255,255,255,0.04)"
              />
              {/* Revenue bar */}
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={5}
                fill={d.value > 0 ? "rgba(16,185,129,0.75)" : "rgba(255,255,255,0.05)"}
              />
              {/* Day label */}
              <text
                x={x + BAR_W / 2}
                y={HEIGHT + 16}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(148,163,184,0.9)"
                fontWeight="700"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
