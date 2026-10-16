import { useEffect, useMemo, useRef } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject, Feature } from "geojson";
import type { Layer, Path, PathOptions } from "leaflet";
import type { JoinedFeature, MapLayer, PlaceOption } from "../types";
import { LAYER_OPTIONS, layerColor, legendFor } from "../scales";
import type { BlockGroup } from "../types";

interface MapExplorerProps {
  features: JoinedFeature[];
  places: PlaceOption[];
  place: string;
  layer: MapLayer;
  selectedId: string | null;
  onPlace: (place: string) => void;
  onLayer: (layer: MapLayer) => void;
  onSelect: (geoid: string) => void;
}

function styleFor(feature: JoinedFeature, layer: MapLayer, selectedId: string | null): PathOptions {
  const selected = feature.properties.block_group_geoid === selectedId;
  return {
    color: selected ? "#1c332b" : "#ffffff",
    weight: selected ? 2.4 : 0.4,
    opacity: 1,
    fillColor: layerColor(feature.properties, layer),
    fillOpacity: 0.86,
  };
}

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const refresh = () => map.invalidateSize();
    const id = window.setTimeout(refresh, 0);
    window.addEventListener("resize", refresh);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", refresh);
    };
  }, [map]);
  return null;
}

function FitToFeatures({ features }: { features: JoinedFeature[] }) {
  const map = useMap();
  useEffect(() => {
    if (features.length === 0) return;
    const group = L.geoJSON({
      type: "FeatureCollection",
      features,
    } as GeoJsonObject);
    const box = group.getBounds();
    if (box.isValid()) map.fitBounds(box, { padding: [18, 18] });
  }, [features, map]);
  return null;
}

function StyledGroups({
  features,
  place,
  layer,
  selectedId,
  onSelect,
}: {
  features: JoinedFeature[];
  place: string;
  layer: MapLayer;
  selectedId: string | null;
  onSelect: (geoid: string) => void;
}) {
  const groupRef = useRef<L.GeoJSON | null>(null);
  const collection = useMemo(
    () => ({ type: "FeatureCollection" as const, features }),
    [features],
  );

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.eachLayer((leafletLayer) => {
      const path = leafletLayer as Path & { feature?: Feature };
      const feature = path.feature as unknown as JoinedFeature | undefined;
      if (!feature) return;
      path.setStyle(styleFor(feature, layer, selectedId));
    });
  }, [layer, selectedId, features]);

  return (
    <GeoJSON
      key={place}
      ref={groupRef}
      data={collection as GeoJsonObject}
      style={(feature) => styleFor(feature as unknown as JoinedFeature, layer, selectedId)}
      onEachFeature={(feature: Feature, leafletLayer: Layer) => {
        leafletLayer.on("click", () => {
          const geoid = String(feature.properties?.block_group_geoid ?? "");
          if (geoid) onSelect(geoid);
        });
      }}
    />
  );
}

function formatNumber(value: number | null, digits = 1): string {
  if (value == null) return "Not measured";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function inkFor(hex: string): string {
  const channels = hex.match(/\w\w/g)?.map((part) => parseInt(part, 16)) ?? [200, 200, 200];
  const luminance = (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]) / 255;
  return luminance > 0.62 ? "#1c332b" : "#f7f3ea";
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function dollarComparison(value: number, peers: number[], place: string): string {
  const mid = median(peers);
  if (mid == null) return "No other measured block groups in this jurisdiction.";
  const delta = value - mid;
  const money = (amount: number) =>
    `$${Math.round(amount).toLocaleString("en-US")}`;
  if (Math.abs(delta) < 50) return `Near the ${place} median (${money(mid)})`;
  const direction = delta > 0 ? "above" : "below";
  return `${money(Math.abs(delta))} ${direction} the ${place} median`;
}

function povertyNote(share: number, peers: number[], below: number | null, universe: number | null): string {
  const people = `${formatNumber(below, 0)} of ${formatNumber(universe, 0)}`;
  const mid = median(peers);
  if (mid == null) return people;
  const delta = share - mid;
  const compare =
    Math.abs(delta) < 0.5 ? "Near city median" : `${Math.abs(delta).toFixed(0)} pts ${delta > 0 ? "above" : "below"} median`;
  return `${compare} · ${people}`;
}

function comparedWith(value: number, peers: number[], place: string, unit: string, digits: number): string {
  const mid = median(peers);
  if (mid == null) return "No other measured block groups in this jurisdiction.";
  const delta = value - mid;
  const amount = Math.abs(delta).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
  const baseline = mid.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
  if (Math.abs(delta) < (digits === 0 ? 50 : 0.05)) {
    return `Near the ${place} median (${baseline})`;
  }
  const direction = delta > 0 ? "above" : "below";
  return `${amount} ${unit} ${direction} the ${place} median`;
}

function AttributeCards({
  row,
  peers,
}: {
  row: BlockGroup;
  peers: BlockGroup[];
}) {
  const place = row.county_namelsad || "this jurisdiction";
  const heatPeers = peers
    .map((item) => item.heat_severity_block_group_mean)
    .filter((value): value is number => value != null);
  const canopyPeers = peers
    .map((item) => item.tree_canopy_block_group_mean)
    .filter((value): value is number => value != null);
  const imperviousPeers = peers
    .map((item) => item.impervious_block_group_mean)
    .filter((value): value is number => value != null);
  const incomePeers = peers
    .filter((item) => item.median_household_income_status === "numeric")
    .map((item) => item.median_household_income_dollars)
    .filter((value): value is number => value != null);
  const povertyShare = shareUnderTwicePoverty(row);
  const povertyPeers = peers
    .map(shareUnderTwicePoverty)
    .filter((value): value is number => value != null);

  const cards: { title: string; value: string; note: string; color: string }[] = [
    {
      title: "Heat severity",
      color: layerColor(row, "heat"),
      value:
        row.heat_severity_block_group_mean == null
          ? "No pixels"
          : formatNumber(row.heat_severity_block_group_mean, 2),
      note:
        row.heat_severity_block_group_mean == null
          ? "Not measured"
          : comparedWith(row.heat_severity_block_group_mean, heatPeers, place, "class points", 2),
    },
    {
      title: "Tree canopy",
      color: layerColor(row, "canopy"),
      value:
        row.tree_canopy_block_group_mean == null
          ? "Missing"
          : formatNumber(row.tree_canopy_block_group_mean, 1),
      note:
        row.tree_canopy_block_group_mean == null
          ? "Not measured"
          : comparedWith(row.tree_canopy_block_group_mean, canopyPeers, place, "points", 1),
    },
    {
      title: "Impervious surface",
      color: layerColor(row, "impervious"),
      value:
        row.impervious_block_group_mean == null
          ? "Missing"
          : formatNumber(row.impervious_block_group_mean, 1),
      note:
        row.impervious_block_group_mean == null
          ? "Not measured"
          : comparedWith(row.impervious_block_group_mean, imperviousPeers, place, "points", 1),
    },
    {
      title: "Median household income",
      color: layerColor(row, "income"),
      value:
        row.median_household_income_status === "numeric" && row.median_household_income_dollars != null
          ? `$${Math.round(row.median_household_income_dollars).toLocaleString("en-US")}`
          : row.median_household_income_status === "top_coded"
            ? "250,000+"
            : row.median_household_income_status === "insufficient_sample"
              ? "Suppressed"
              : "No record",
      note:
        row.median_household_income_status === "numeric" && row.median_household_income_dollars != null
          ? dollarComparison(row.median_household_income_dollars, incomePeers, place)
          : row.median_household_income_status === "top_coded"
            ? "Top-coded"
            : row.median_household_income_status === "insufficient_sample"
              ? "Insufficient sample"
              : "No income record",
    },
    {
      title: "Below 2× poverty",
      color: layerColor(row, "poverty"),
      value: povertyShare == null ? "No count" : `${povertyShare.toFixed(0)}%`,
      note:
        povertyShare == null
          ? "No people counted"
          : povertyNote(povertyShare, povertyPeers, row.below_twice_poverty, row.poverty_universe),
    },
  ];

  return (
    <div className="attribute-stack">
      {cards.map((card) => (
        <article
          key={card.title}
          className="attribute-card"
          style={{ background: card.color, color: inkFor(card.color) }}
        >
          <p className="metric-label">{card.title}</p>
          <p className="metric-value">{card.value}</p>
          <p>{card.note}</p>
        </article>
      ))}
    </div>
  );
}

function shareUnderTwicePoverty(row: BlockGroup): number | null {
  if (row.poverty_universe == null || row.poverty_universe <= 0 || row.below_twice_poverty == null) {
    return null;
  }
  return (row.below_twice_poverty / row.poverty_universe) * 100;
}

function povertyText(row: JoinedFeature["properties"]): string {
  if (row.poverty_universe == null) return "No poverty record.";
  if (row.poverty_universe <= 0) return "Poverty universe is zero.";
  const underLine =
    row.below_poverty == null
      ? "Not measured"
      : `${Math.round(row.below_poverty).toLocaleString("en-US")} under the poverty line`;
  const underTwice =
    row.below_twice_poverty == null
      ? "Not measured"
      : `${Math.round(row.below_twice_poverty).toLocaleString("en-US")} below twice the poverty line`;
  const margin =
    row.below_twice_poverty_moe == null
      ? ""
      : ` (±${Math.round(row.below_twice_poverty_moe).toLocaleString("en-US")} people on that count)`;
  return `${underLine}; ${underTwice} of ${Math.round(row.poverty_universe).toLocaleString("en-US")}${margin}.`;
}

function incomeText(row: JoinedFeature["properties"]): string {
  if (row.median_household_income_status === "numeric") {
    const dollars = row.median_household_income_dollars;
    const margin = row.median_household_income_moe_dollars;
    const amount = dollars == null ? "Not measured" : `$${Math.round(dollars).toLocaleString("en-US")}`;
    const moe = margin == null ? "" : ` (±$${Math.round(margin).toLocaleString("en-US")})`;
    return `${amount}${moe}`;
  }
  if (row.median_household_income_status === "insufficient_sample") {
    return "Insufficient sample";
  }
  if (row.median_household_income_status === "top_coded") {
    return "Top-coded at 250,000+";
  }
  return "No income record.";
}

export function MapExplorer({
  features,
  places,
  place,
  layer,
  selectedId,
  onPlace,
  onLayer,
  onSelect,
}: MapExplorerProps) {
  const visible = useMemo(
    () => (place === "all" ? features : features.filter((feature) => feature.properties.county_fips === place)),
    [features, place],
  );
  const selected = visible.find((feature) => feature.properties.block_group_geoid === selectedId) ?? null;
  const legend = legendFor(layer);

  return (
    <section id="map" className="section">
      <h2 className="visually-hidden">Explore map</h2>
      <div className="map-layout">
        <div className="map-controls">
          <label>
            City or county
            <select value={place} onChange={(event) => onPlace(event.target.value)}>
              <option value="all">All Virginia jurisdictions</option>
              {places.map((option) => (
                <option key={option.countyFips} value={option.countyFips}>
                  {option.name} ({option.blockGroups.toLocaleString("en-US")})
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Map layer</legend>
            {LAYER_OPTIONS.map((option) => (
              <label key={option.id} className="radio-row">
                <input
                  type="radio"
                  name="map-layer"
                  checked={layer === option.id}
                  onChange={() => onLayer(option.id)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <div className="legend">
            <p className="legend-title">{legend.title}</p>
            <ul>
              {legend.items.map((item) => (
                <li key={item.label}>
                  <span className="swatch" style={{ background: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
            <p>{legend.note}</p>
          </div>
        </div>
        <div className="map-stage">
          <MapContainer
            center={[37.5, -79.4]}
            zoom={7}
            scrollWheelZoom
            className="map-frame"
            preferCanvas
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ResizeMap />
            <FitToFeatures features={visible} />
            <StyledGroups
              features={visible}
              place={place}
              layer={layer}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </MapContainer>
          <aside className="detail-card">
            {selected ? (
              <>
                <p className="eyebrow">{selected.properties.county_namelsad}</p>
                <h3>
                  Tract {selected.properties.tract_code}, block group{" "}
                  {selected.properties.block_group_code}
                </h3>
                <p className="geoid">GEOID {selected.properties.block_group_geoid}</p>
                <AttributeCards
                  row={selected.properties}
                  peers={features
                    .filter((feature) => feature.properties.county_fips === selected.properties.county_fips)
                    .map((feature) => feature.properties)}
                />
                <div className="detail-meta">
                  <dl>
                    <div>
                      <dt>Majority heat class</dt>
                      <dd>
                        {selected.properties.heat_severity_block_group_majority_class == null
                          ? "Not measured"
                          : `${formatNumber(selected.properties.heat_severity_block_group_majority_class, 0)} (${formatNumber(selected.properties.heat_severity_block_group_majority_percent, 1)}% of counted pixels)`}
                      </dd>
                    </div>
                    <div>
                      <dt>Income detail</dt>
                      <dd>{incomeText(selected.properties)}</dd>
                    </div>
                    <div>
                      <dt>Poverty ratio, 2024</dt>
                      <dd>{povertyText(selected.properties)}</dd>
                    </div>
                    <div>
                      <dt>Land / water area</dt>
                      <dd>
                        {formatNumber(selected.properties.land_area_sq_m, 0)} m² land,{" "}
                        {formatNumber(selected.properties.water_area_sq_m, 0)} m² water
                      </dd>
                    </div>
                  </dl>
                </div>
              </>
            ) : (
              <div className="detail-meta">
                <h3>Block-group detail</h3>
                <p>Click a block group.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
