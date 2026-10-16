import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BlockGroup } from "../types";

interface Point {
  x: number;
  y: number;
  name: string;
  geoid: string;
}

interface FitResult {
  slope: number;
  intercept: number;
  r: number;
  r2: number;
  pValue: number;
  line: Point[];
}

interface AnalysisProps {
  rows: BlockGroup[];
  placeName: string;
  statewideHeat: boolean;
}

function leastSquares(data: Point[]): FitResult | null {
  const n = data.length;
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
  }

  const denomX = n * sumXX - sumX * sumX;
  if (denomX <= 0) return null; // Variance of X must be > 0

  const denomY = Math.max(0, n * sumYY - sumY * sumY);
  const numerator = n * sumXY - sumX * sumY;

  const slope = numerator / denomX;
  const intercept = (sumY - slope * sumX) / n;

  // Clamp r to [-1, 1] safely
  const r = denomY > 0 ? Math.min(1, Math.max(-1, numerator / Math.sqrt(denomX * denomY))) : 0;
  const r2 = r * r;

  // t-statistic for p-value
  const df = n - 2;
  const t = Math.abs(r) * Math.sqrt(df / Math.max(1 - r2, 1e-15));
  const rawP = studentTPValue(t, df);
  const pValue = Number.isNaN(rawP) ? 1 : rawP;

  const xs = data.map((point) => point.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);

  return {
    slope,
    intercept,
    r,
    r2,
    pValue,
    line: [
      { x: min, y: intercept + slope * min, name: "Least-squares fit", geoid: "" },
      { x: max, y: intercept + slope * max, name: "Least-squares fit", geoid: "" },
    ],
  };
}

function studentTPValue(t: number, df: number): number {
  const x = df / (df + t * t);
  return incompleteBeta(df / 2, 0.5, x);
}

function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(b, a, 1 - x);
  }

  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a;

  let f = 1.0;
  let c = 1.0;
  let d = 0.0;

  for (let i = 0; i <= 200; i++) {
    const m = Math.floor(i / 2);
    let numerator: number;

    if (i === 0) {
      numerator = 1;
    } else if (i % 2 === 0) {
      numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    } else {
      numerator = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    }

    d = 1.0 + numerator * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1.0 / d;

    c = 1.0 + numerator / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;

    f = f * d * c;
    if (Math.abs(d * c - 1.0) < 1e-12) break;
  }

  return front * f;
}

function logGamma(z: number): number {
  const c = [
    676.5203681218851, -1259.139216722289, 771.3234287776531,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.984369578019571e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < c.length; i++) {
    x += c[i] / (z + i + 1);
  }
  const t = z + c.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function points(
  rows: BlockGroup[],
  xValue: (row: BlockGroup) => number | null,
  yValue: (row: BlockGroup) => number | null,
): Point[] {
  const plotted: Point[] = [];
  for (const row of rows) {
    const x = xValue(row);
    const y = yValue(row);
    if (x == null || y == null) continue;
    plotted.push({
      x,
      y,
      name: row.county_namelsad,
      geoid: row.block_group_geoid,
    });
  }
  return plotted;
}

function SmallDot(props: unknown) {
  const point = props as { cx?: number; cy?: number };
  if (point.cx == null || point.cy == null) return <g />;
  return <circle cx={point.cx} cy={point.cy} r={4.1} fill="#2f6b4f" fillOpacity={0.55} />;
}

function formatPValue(p: number): string {
  if (p < 0.001) return "p < 0.001";
  return `p = ${p.toFixed(3)}`;
}

function formatChartValue(value: number, name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("income")) return `$${Math.round(value).toLocaleString("en-US")}`;
  if (lower.includes("poverty") || lower.includes("%")) return `${value.toFixed(1)}%`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function ChartCard({
  title,
  caption,
  points: data,
  xLabel,
  yLabel,
  xTick,
  yDomain,
  incomeAxis,
  percentAxis,
}: {
  title: string;
  caption: string;
  points: Point[];
  xLabel: string;
  yLabel: string;
  xTick: (value: number) => string;
  yDomain?: [number, number];
  incomeAxis?: boolean;
  percentAxis?: boolean;
}) {
  const fit = leastSquares(data);

  const slopeText = fit
    ? incomeAxis
      ? `${(fit.slope * 10000).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${yLabel.toLowerCase()} per $10,000 of median income`
      : percentAxis
        ? `${(fit.slope * 10).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${yLabel.toLowerCase()} per 10 percentage points`
        : `${fit.slope.toLocaleString("en-US", { maximumFractionDigits: 3 })} ${yLabel.toLowerCase()} per one unit on horizontal axis`
    : "";

  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <p className="chart-caption">
        {caption} Sample size: {data.length.toLocaleString("en-US")} block groups. Blank
        values are left off the chart and are not drawn at zero.
      </p>

      {/* Prominent Stats Badge Bar */}
      {fit ? (
        <div className="chart-stats-badge" style={{ margin: "6px 0", fontSize: "0.85rem", color: "#2f6b4f" }}>
          <strong>r:</strong> {fit.r.toFixed(2)} &nbsp;|&nbsp; 
          <strong>R²:</strong> {fit.r2.toFixed(2)} &nbsp;|&nbsp; 
          <strong>p-value:</strong> {formatPValue(fit.pValue)}
        </div>
      ) : null}

      {data.length === 0 ? (
        <p className="empty-state">No block groups in this selection have both measurements.</p>
      ) : (
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart margin={{ top: 12, right: 12, bottom: 28, left: 8 }}>
              <CartesianGrid stroke="#e6dfd2" />
              <XAxis
                dataKey="x"
                type="number"
                name={xLabel}
                tickFormatter={xTick}
                tick={{ fill: "#4d564f", fontSize: 12 }}
                label={{ value: xLabel, position: "bottom", offset: 8, fill: "#24312b" }}
              />
              <YAxis
                dataKey="y"
                type="number"
                name={yLabel}
                domain={yDomain ?? ["auto", "auto"]}
                allowDataOverflow={Boolean(yDomain)}
                tick={{ fill: "#4d564f", fontSize: 12 }}
                width={56}
                label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "#24312b" }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value: number, name: string) => [
                  formatChartValue(value, name),
                  name,
                ]}
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload as Point | undefined;
                  if (point?.geoid) {
                    return `${point.name} · ${point.geoid}`;
                  }
                  return fit
                    ? `Least-squares fit (r=${fit.r.toFixed(2)}, R²=${fit.r2.toFixed(2)}, ${formatPValue(fit.pValue)})`
                    : "Least-squares fit";
                }}
              />
              <Scatter
                data={data}
                name={xLabel}
                fill="#2f6b4f"
                shape={SmallDot}
                isAnimationActive={false}
              />
              {fit ? (
                <Line
                  data={fit.line}
                  dataKey="y"
                  name="Least-squares fit"
                  stroke="#ff6a00"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={false}
                  legendType="none"
                  isAnimationActive={false}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

const dollars = (value: number) =>
  value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${Math.round(value)}`;
const plain = (value: number) => value.toFixed(0);
const percentTick = (value: number) => `${Math.round(value)}%`;

function shareUnderTwicePoverty(row: BlockGroup): number | null {
  if (row.poverty_universe == null || row.poverty_universe <= 0 || row.below_twice_poverty == null) {
    return null;
  }
  return (row.below_twice_poverty / row.poverty_universe) * 100;
}

export function Analysis({ rows, placeName, statewideHeat }: AnalysisProps) {
  const incomeCanopy = points(
    rows,
    (row) =>
      row.median_household_income_status === "numeric" ? row.median_household_income_dollars : null,
    (row) => row.tree_canopy_block_group_mean,
  );
  const incomeHeat = points(
    rows,
    (row) =>
      row.median_household_income_status === "numeric" ? row.median_household_income_dollars : null,
    (row) => row.heat_severity_block_group_mean,
  );
  const incomeImpervious = points(
    rows,
    (row) =>
      row.median_household_income_status === "numeric" ? row.median_household_income_dollars : null,
    (row) => row.impervious_block_group_mean,
  );
  const heatCanopy = points(
    rows,
    (row) => row.tree_canopy_block_group_mean,
    (row) => row.heat_severity_block_group_mean,
  );
  const heatImpervious = points(
    rows,
    (row) => row.impervious_block_group_mean,
    (row) => row.heat_severity_block_group_mean,
  );
  const povertyIncome = points(
    rows,
    (row) =>
      row.median_household_income_status === "numeric" ? row.median_household_income_dollars : null,
    shareUnderTwicePoverty,
  );
  const povertyHeat = points(
    rows,
    shareUnderTwicePoverty,
    (row) => row.heat_severity_block_group_mean,
  );
  const omittedIncome = rows.filter((row) => row.median_household_income_status !== "numeric").length;
  const omittedPoverty = rows.filter((row) => shareUnderTwicePoverty(row) == null).length;

  return (
    <section id="analysis" className="section">
      <div className="section-heading">
        <h2>Analysis</h2>
        <p>
          Charts use {placeName}. Each point is one block group. Canopy and impervious
          axes are zonal means on a flagged percent scale. Heat severity is an average of
          class codes from 1 to 5, not degrees.
        </p>
      </div>
      <p className="inline-note">
        {omittedIncome.toLocaleString("en-US")} block groups in this view are omitted from
        the income charts because the estimate is suppressed, top-coded, or otherwise not a
        single dollar amount. {omittedPoverty.toLocaleString("en-US")} are omitted from the
        poverty charts because the poverty universe is zero or missing.
      </p>
      <div className="chart-grid">
        <ChartCard
          title="Income and tree canopy"
          caption="Horizontal axis: median household income in 2024 dollars. Vertical axis: tree-canopy zonal mean."
          points={incomeCanopy}
          xLabel="Median income"
          yLabel="Canopy mean"
          xTick={dollars}
          incomeAxis
        />
        <ChartCard
          title="Income and impervious surface"
          caption="Horizontal axis: median household income in 2024 dollars. Vertical axis: impervious-surface zonal mean."
          points={incomeImpervious}
          xLabel="Median income"
          yLabel="Impervious mean"
          xTick={dollars}
          incomeAxis
        />
        <ChartCard
          title="Income and share below twice the poverty line"
          caption="Horizontal axis: median household income in 2024 dollars. Vertical axis: percent of people below twice the Census poverty line."
          points={povertyIncome}
          xLabel="Median income"
          yLabel="Below twice the poverty line (%)"
          xTick={dollars}
          yDomain={[0, 100]}
          incomeAxis
        />
        <ChartCard
          title="Income and heat severity"
          caption="Horizontal axis: median household income in 2024 dollars. Vertical axis: mean of within-city heat classes, not degrees."
          points={incomeHeat}
          xLabel="Median income"
          yLabel="Heat class mean"
          xTick={dollars}
          yDomain={[1, 5]}
          incomeAxis
        />
        <ChartCard
          title="Share below twice the poverty line and heat severity"
          caption="Horizontal axis: percent of people below twice the Census poverty line. Vertical axis: mean of within-city heat classes, not degrees."
          points={povertyHeat}
          xLabel="Below twice the poverty line"
          yLabel="Heat class mean"
          xTick={percentTick}
          yDomain={[1, 5]}
          percentAxis
        />
        <ChartCard
          title="Heat severity and tree canopy"
          caption="Vertical axis: mean of within-city heat classes. Class 1 is mildly above that city's mean, and class 5 is far above it."
          points={heatCanopy}
          xLabel="Canopy mean"
          yLabel="Heat class mean"
          xTick={plain}
          yDomain={[1, 5]}
        />
        <ChartCard
          title="Heat severity and impervious surface"
          caption="Vertical axis: mean of within-city heat classes. This is not a temperature."
          points={heatImpervious}
          xLabel="Impervious mean"
          yLabel="Heat class mean"
          xTick={plain}
          yDomain={[1, 5]}
        />
      </div>
      {statewideHeat ? (
        <p className="warning">
          All Virginia jurisdictions are selected. Heat classes are calculated inside each
          city, so a class-4 block group in one city is not the same surface temperature as
          a class-4 block group in another city. Use a single jurisdiction before comparing
          heat severity.
        </p>
      ) : null}
    </section>
  );
}