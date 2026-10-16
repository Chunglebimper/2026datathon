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

interface AnalysisProps {
  rows: BlockGroup[];
  placeName: string;
  statewideHeat: boolean;
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

function leastSquares(data: Point[]): { slope: number; line: Point[] } | null {
  if (data.length < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumXX += point.x * point.x;
  }
  const denominator = data.length * sumXX - sumX * sumX;
  if (denominator === 0) return null;
  const slope = (data.length * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / data.length;
  const xs = data.map((point) => point.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return {
    slope,
    line: [
      { x: min, y: intercept + slope * min, name: "Fit", geoid: "" },
      { x: max, y: intercept + slope * max, name: "Fit", geoid: "" },
    ],
  };
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
}: {
  title: string;
  caption: string;
  points: Point[];
  xLabel: string;
  yLabel: string;
  xTick: (value: number) => string;
  yDomain?: [number, number];
  incomeAxis?: boolean;
}) {
  const fit = leastSquares(data);
  const slopeText = fit
    ? incomeAxis
      ? `${(fit.slope * 10000).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${yLabel.toLowerCase()} per $10,000 of median income`
      : `${fit.slope.toLocaleString("en-US", { maximumFractionDigits: 3 })} ${yLabel.toLowerCase()} per one unit on the horizontal axis`
    : "";

  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <p className="chart-caption">
        {caption} Sample size: {data.length.toLocaleString("en-US")} block groups. Blank
        values are left off the chart and are not drawn at zero.
        {fit
          ? ` The line is an ordinary least-squares fit of these points: ${slopeText}. It summarizes the plotted block groups only.`
          : ""}
      </p>
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
                  name.toLowerCase().includes("income")
                    ? `$${Math.round(value).toLocaleString("en-US")}`
                    : value.toLocaleString("en-US", { maximumFractionDigits: 2 }),
                  name,
                ]}
                labelFormatter={(_label, payload) => {
                  const point = payload?.[0]?.payload as Point | undefined;
                  return point?.geoid ? `${point.name} · ${point.geoid}` : "Least-squares fit";
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

export function Analysis({ rows, placeName, statewideHeat }: AnalysisProps) {
  const incomeCanopy = points(
    rows,
    (row) =>
      row.median_household_income_status === "numeric" ? row.median_household_income_dollars : null,
    (row) => row.tree_canopy_block_group_mean,
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
  const omittedIncome = rows.filter((row) => row.median_household_income_status !== "numeric").length;

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
        single dollar amount.
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
