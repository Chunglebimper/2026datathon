import { useEffect, useMemo, useState } from "react";
import { Analysis } from "./components/Analysis";
import { MapExplorer } from "./components/MapExplorer";
import { Methodology } from "./components/Methodology";
import { Overview } from "./components/Overview";
import { Recommendations } from "./components/Recommendations";
import { coverageMetrics, loadDashboardData, placeOptions, povertyRecommendation } from "./data";
import type { BlockGroup, JoinedFeature, MapLayer } from "./types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "map", label: "Explore Map" },
  { id: "analysis", label: "Analysis" },
  { id: "recommendations", label: "Recommendations" },
  { id: "methods", label: "Methods" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [rows, setRows] = useState<BlockGroup[]>([]);
  const [features, setFeatures] = useState<JoinedFeature[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [place, setPlace] = useState("all");
  const [layer, setLayer] = useState<MapLayer>("heat");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    let active = true;
    loadDashboardData()
      .then((data) => {
        if (!active) return;
        setRows(data.rows);
        setFeatures(data.features);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "The dashboard data could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => coverageMetrics(rows), [rows]);
  const poverty = useMemo(() => povertyRecommendation(rows), [rows]);
  const places = useMemo(() => placeOptions(rows), [rows]);
  const placeName =
    place === "all" ? "all Virginia jurisdictions" : places.find((item) => item.countyFips === place)?.name ?? "the selected jurisdiction";
  const visibleRows = useMemo(
    () => (place === "all" ? rows : rows.filter((row) => row.county_fips === place)),
    [rows, place],
  );

  function choosePlace(next: string) {
    setPlace(next);
    setSelectedId(null);
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <p className="eyebrow">Virginia Datathon · neighborhood conditions</p>
          <h1>Hot Neighborhoods, Higher Costs</h1>
          <p className="subtitle">Identifying Heat Vulnerability and Cooling Needs Across Virginia</p>
          <p className="intro">
            A working view for local government staff. It shows where block groups have
            heat measurements, tree canopy, impervious surface, median household
            income, and the share of people below twice the poverty line. Heat
            severity describes conditions relative to the same city. It is not a
            temperature, and this version does not rank cities against each other.
          </p>
        </div>
      </header>
      <nav className="tab-bar" role="tablist" aria-label="Dashboard sections">
        <div className="tab-bar-inner">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      <main>
        {status === "loading" ? <p className="status-banner">Loading the block-group table and boundaries.</p> : null}
        {status === "error" ? (
          <p className="status-banner error" role="alert">
            {message} Run the site from the web folder so the files in public/data are available.
          </p>
        ) : null}
        {status === "ready" ? (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "overview" ? <Overview metrics={metrics} /> : null}
            {tab === "map" ? (
              <MapExplorer
                features={features}
                places={places}
                place={place}
                layer={layer}
                selectedId={selectedId}
                onPlace={choosePlace}
                onLayer={setLayer}
                onSelect={setSelectedId}
              />
            ) : null}
            {tab === "analysis" ? (
              <Analysis rows={visibleRows} placeName={placeName} statewideHeat={place === "all"} />
            ) : null}
            {tab === "recommendations" ? <Recommendations poverty={poverty} /> : null}
            {tab === "methods" ? <Methodology metrics={metrics} /> : null}
          </div>
        ) : null}
      </main>
    </>
  );
}
