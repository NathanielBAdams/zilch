"use client";

// Same validated categorical order as ScoreChart — kept as a separate literal
// here rather than shared, since this chart's data shape (a plain named
// series) is deliberately decoupled from the in-game GamePlayer/history types.
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

const VB_W = 360;
const VB_H = 200;
const MARGIN = { top: 14, right: 14, bottom: 26, left: 34 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;

type Series = { id: string; name: string; points: number[] };

type Props = {
  series: Series[];
  /** Fixed y-domain (e.g. [0, 100] for a percentage) rather than derived from the data. */
  yDomain: [number, number];
};

export default function TrendChart({ series, yDomain }: Props) {
  const maxLen = Math.max(1, ...series.map((s) => s.points.length));
  const [yMin, yMax] = yDomain;

  const xAt = (i: number) => MARGIN.left + (maxLen <= 1 ? 0 : (i / (maxLen - 1)) * PLOT_W);
  const yAt = (v: number) => MARGIN.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H;

  const yTicks = [yMin, yMin + (yMax - yMin) * 0.25, yMin + (yMax - yMin) * 0.5, yMin + (yMax - yMin) * 0.75, yMax];

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="score-chart" role="img" aria-label="Trend over time">
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={MARGIN.left} x2={VB_W - MARGIN.right} y1={yAt(tick)} y2={yAt(tick)} className="chart-grid" />
            <text x={MARGIN.left - 6} y={yAt(tick) + 3} className="chart-axis-text" textAnchor="end">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {series.map((s, sIdx) =>
          s.points.length > 0 ? (
            <path
              key={s.id}
              d={s.points.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ")}
              fill="none"
              stroke={SERIES_COLORS[sIdx % SERIES_COLORS.length]}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null,
        )}

        {series.map((s, sIdx) => {
          const last = s.points[s.points.length - 1];
          return last === undefined ? null : (
            <circle
              key={s.id}
              cx={xAt(s.points.length - 1)}
              cy={yAt(last)}
              r={4}
              fill={SERIES_COLORS[sIdx % SERIES_COLORS.length]}
              stroke="#fff"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>

      <div className="chart-readout" style={{ marginTop: 4 }}>
        {series.map((s, sIdx) => (
          <div className="chart-readout-row" key={s.id}>
            <span className="chart-readout-color" style={{ background: SERIES_COLORS[sIdx % SERIES_COLORS.length] }} />
            <span className="chart-readout-name">{s.name}</span>
            <span className="chart-readout-value">
              {s.points.length > 0 ? `${Math.round(s.points[s.points.length - 1])}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
