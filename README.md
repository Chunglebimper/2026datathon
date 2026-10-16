# 2026datathon

Raw data: https://drive.google.com/drive/folders/1vdxXsQpGEyNhjCeXMStn8fUEJG6XWafo?usp=share_link

hello welcome to the 2026 datathon readme

i hope you like it

yay

The working product is a static dashboard, **Hot Neighborhoods, Higher Costs: Identifying Heat Vulnerability and Cooling Needs Across Virginia**. It is for local government staff. The map and charts use census block groups only. Census-block rows were cleaned and kept, but they are not drawn on the site. There is no composite vulnerability score, and heat classes are not treated as temperatures or compared across cities.

## Tech stack

The site is a static React app in `web/`. It has no backend. The browser loads CSV and GeoJSON from `web/public/data/`.

- React 18 and TypeScript
- Vite 6, with relative asset paths (`base: './'`) so `web/dist` can be published on GitHub Pages
- Leaflet and react-leaflet for the block-group map
- Recharts for the scatterplots
- Python 3 standard library for cleaning and for the map-geometry export (`csv`, `json`, and `mmap`). The cleaning script does not use pandas.

The page is one app with five tabs: Overview, Explore Map, Analysis, Recommendations, and Methods. The map can filter to a Virginia county or independent city and switch among heat severity, tree canopy, impervious surface, median household income, and the share of people below twice the poverty line. Clicking a block group opens attribute cards colored with the same scale as the map. Analysis draws an ordinary least-squares line through the plotted points and labels it as a chart summary, not a causal finding. Recommendations includes a project chatbot in an iframe. Methods records the measurement rules and the source links.

## Data cleaning

Source files are read only. Missing measurements stay blank. They are not filled with zero. The write-up of the checks is `docs/validation_report.md`, and the column definitions are `data/processed/data_dictionary.csv`.

`scripts/prepare_virginia_tables.py` joins the block-group layers on the 12-digit GEOID and writes two tables:

- `data/processed/virginia_block_groups_clean.csv` — 5,963 block groups, one row per GEOID. This is the table the dashboard uses.
- `data/processed/virginia_census_blocks_clean.csv` — 163,491 census blocks. Block-group income, canopy, impervious surface, and heat are copied onto each block by the first 12 digits of the block GEOID. Those copied fields are still block-group measurements.

The script, as written, looks for the raw GeoJSON and ACS files in the same directory as the script and writes its outputs there. The copies used by this repo live in `data/processed/`. Raw inputs are kept in `data/raw/` and are listed in `.gitignore`, because they are too large for GitHub. Processed tables are meant to be committed.

What the join kept:

- Tree canopy and impervious surface are block-group zonal means. Values other than two canopy maxima of 254 fall between 0 and 100, which is consistent with percent cover. The source files do not name the unit or year, so percent stays flagged. A mean of 0 is kept, including eight water-only block groups with no land area. The two canopy maxima of 254 (`510839304001` in Halifax County and `511670304021` in Russell County) are retained and flagged. They are not replaced.
- Heat severity is a within-city class from 1 to 5 (Jenks natural breaks on Trust for Public Land’s Heat Severity — USA 2025). The mapped value is the zonal mean of those class codes. 4,333 block groups have a heat mean. The other 1,630 are blank because the zonal join found no heat pixels. Blank is not class 0.
- Median household income is ACS 2024 5-year table B19013, in 2024 inflation-adjusted dollars. 5,405 block groups have a numeric estimate. 354 are an insufficient sample (`-`) and 204 are top-coded (`250,000+`). Those codes stay blank in the dollar field and keep their own status. They are not stored as $0 or $250,000. The margin of error is the Census 90 percent margin when it is numeric.
- Canopy, impervious, and heat block-group files share the same 5,963 GEOIDs and the same land and water areas. Land and water area are Census TIGER square meters.

The poverty layer is joined in the browser, not inside the Python cleaner. `web/public/data/virginia_poverty_ratio_2024.csv` is the ACS 2024 5-year ratio of income to the poverty level, matched on GEOID. “Below twice the poverty line” is everyone in the poverty count except the “2.00 and over” bin. A poverty universe of 0 stays gray on the map. It is not drawn as 0%.

`scripts/export_block_group_geometries.py` copies the cleaned block-group table into `web/public/data/` and writes a simplified boundary file from `data/raw/tcc_cbg.geojson`. Rings are reduced with Douglas-Peucker at 0.00045 degrees. Coordinates stay in longitude and latitude. Simplifying the outline does not change the analytical table.

## Run the site locally

From the repository root, refresh the map files after the cleaned table changes:

```bash
python3 scripts/export_block_group_geometries.py
```

Then start the site:

```bash
cd web
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173/`. `npm run build` writes a static site to `web/dist`, and `npm run preview` serves that build on your machine.

## Publish it on GitHub Pages

The Pages screen that offers only **root** or **docs** is “Deploy from a branch.” That choice does not look inside `web/`. It publishes one folder of finished files, and that folder has to contain `index.html`.

Use **docs**, not the repository root. The root is the project, and `web/index.html` is only the development page. It loads TypeScript, which GitHub Pages cannot run. The publishable site is the Vite build:

- `docs/index.html`
- `docs/assets/` (the compiled JavaScript and CSS)
- `docs/data/` (the block-group table, poverty table, and map boundaries)
- `docs/.nojekyll` (tells GitHub to serve those files as they are)

Those files are already in `docs/`. Commit and push the `dashboard` branch, then in **Settings → Pages** set:

1. **Source:** Deploy from a branch
2. **Branch:** `dashboard`
3. **Folder:** `/docs`

Save. After GitHub finishes the deploy, the site is at:

https://chunglebimper.github.io/2026datathon/

Rebuild `docs/` after a site change:

```bash
cd web
npm run build
cd ..
rm -rf docs
mkdir docs
cp -R web/dist/. docs/
touch docs/.nojekyll
```

## Sources

- Heat severity: Trust for Public Land, [Heat Severity — USA 2025](https://www.arcgis.com/home/item.html?id=48edb3800dab4f70ae42eb0ccf5e08f4#overview)
- Tree canopy and impervious surface: [MRLC viewer](https://www.mrlc.gov/viewer/) and the [MRLC data download](https://www.mrlc.gov/data)
- Income and poverty ratio: U.S. Census Bureau, 2024 American Community Survey 5-year estimates
- Background essay: Johnny Finn, [The Unequal Geography of Heat](https://johnnyfinn.substack.com/p/the-unequal-geography-of-heat) (September 3, 2026)
