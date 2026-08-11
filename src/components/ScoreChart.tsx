"use client";

import { useRef, useState } from "react";
import { suitColor } from "@/lib/gameLogic";
import type { GamePlayer, RoundHistoryEntry } from "@/lib/types";

type Props = {
  players: GamePlayer[];
  history: RoundHistoryEntry[];
};

// Fixed categorical order — validated for CVD-safe adjacent contrast.
// See dataviz skill: references/palette.md
const SERIES_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

const VB_W = 360;
const VB_H = 200;
const MARGIN = { top: 14, right: 14, bottom: 26, left: 34 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;

function niceCeil(value: number): number {
  if (value <= 10) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

export default function ScoreChart({ players, history }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (history.length === 0) {
    return <p className="history-empty">No rounds played yet.</p>;
  }

  const n = history.length;

  const series = players.map((_, pIdx) => {
    let total = 0;
    const points = [0];
    for (const entry of history) {
      total += entry.roundScores[pIdx];
      points.push(total);
    }
    return points;
  });

  const yMax = niceCeil(Math.max(1, ...series.flat()));
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  const xAt = (i: number) => MARGIN.left + (i / n) * PLOT_W;
  const yAt = (v: number) => MARGIN.top + PLOT_H - (v / yMax) * PLOT_H;

  const xStride = n <= 8 ? 1 : Math.ceil(n / 6);
  const xTickIndices = Array.from({ length: n }, (_, i) => i + 1).filter(
    (i) => i % xStride === 0 || i === n,
  );

  function indexFromClientX(clientX: number): number | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return null;
    const scaleX = VB_W / rect.width;
    const svgX = (clientX - rect.left) * scaleX;
    const frac = (svgX - MARGIN.left) / PLOT_W;
    return Math.min(n, Math.max(0, Math.round(frac * n)));
  }

  function handlePointerMove(e: React.PointerEvent) {
    const idx = indexFromClientX(e.clientX);
    if (idx !== null) setHoverIndex(idx);
  }

  const activeIndex = hoverIndex ?? n;
  const activeEntry = activeIndex > 0 ? history[activeIndex - 1] : null;
  const readoutRows = players
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      color: SERIES_COLORS[i % SERIES_COLORS.length],
      value: series[i][activeIndex],
      delta: activeEntry ? activeEntry.roundScores[i] : null,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="chart-wrap">
      <p className="chart-caption">Drag or tap the chart to inspect any round.</p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="score-chart"
        role="img"
        aria-label="Cumulative score by round for each player"
        onPointerDown={handlePointerMove}
        onPointerMove={(e) => e.buttons === 1 && handlePointerMove(e)}
        onPointerUp={() => setHoverIndex(null)}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={MARGIN.left}
              x2={VB_W - MARGIN.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              className="chart-grid"
            />
            <text x={MARGIN.left - 6} y={yAt(tick) + 3} className="chart-axis-text" textAnchor="end">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {xTickIndices.map((i) => (
          <text key={i} x={xAt(i)} y={VB_H - 8} className="chart-axis-text" textAnchor="middle">
            {i}
          </text>
        ))}

        <line
          x1={xAt(activeIndex)}
          x2={xAt(activeIndex)}
          y1={MARGIN.top}
          y2={yAt(0)}
          className="chart-crosshair"
        />

        {series.map((points, pIdx) => (
          <path
            key={pIdx}
            d={points.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ")}
            fill="none"
            stroke={SERIES_COLORS[pIdx % SERIES_COLORS.length]}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {series.map((points, pIdx) =>
          points.map((v, i) => (
            <circle
              key={`${pIdx}-${i}`}
              cx={xAt(i)}
              cy={yAt(v)}
              r={i === activeIndex ? 5 : 3}
              fill={SERIES_COLORS[pIdx % SERIES_COLORS.length]}
              stroke="#fff"
              strokeWidth={i === activeIndex ? 2 : 1.5}
            />
          )),
        )}

        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          style={{ touchAction: "none", cursor: "crosshair" }}
        />
      </svg>

      <div className="chart-readout">
        <div className="chart-readout-header">
          {activeIndex === 0 ? (
            "Start"
          ) : (
            <>
              Round {activeIndex} of {n}
              {activeEntry?.trump && (
                <span className={`trump-sym-sm ${suitColor(activeEntry.trump)}`}>{activeEntry.trump}</span>
              )}
            </>
          )}
        </div>
        {readoutRows.map((row) => (
          <div className="chart-readout-row" key={row.id}>
            <span className="chart-readout-color" style={{ background: row.color }} />
            <span className="chart-readout-name">{row.name}</span>
            {row.delta !== null && row.delta > 0 && <span className="chart-readout-delta">+{row.delta}</span>}
            <span className="chart-readout-value">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
