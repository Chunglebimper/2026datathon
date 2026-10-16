# Key Findings — The Unequal Geography of Heat

**Source:** Johnny Finn, "The Unequal Geography of Heat," September 3, 2026.
**Co-researcher:** Jillian Balay, Newport News Green Foundation
**Location studied:** Newport News, Virginia (methods generalizable to all Virginia jurisdictions)

---

## Core Thesis

Urban heat is not equally shared. Due to deeply embedded historical and structural inequalities, neighborhoods with higher poverty rates and larger non-White populations have fewer trees, more pavement, and are significantly hotter than Whiter and higher-income areas.

The urban heat island effect is not a natural phenomenon — it is the result of landscapes of inequality that communities have built, and could rebuild, in a more just way.

---

## Key Quantitative Findings

For **Newport News, VA** (census block-group level, 2025 thermal data):

| Variable | Association |
|----------|-------------|
| Every +$10,000 median household income | +1.5 percentage points tree cover, **−1 °F surface temperature** |
| Every +10 pp Black population share | **−2 percentage points tree cover**, +1 °F surface temperature |

These are statistical associations (not direct causation), but they reveal a systematic pattern:
**Wealth buys shade. Poverty concentrates heat.**

---

## How Heat Inequality Manifests

1. **Tree canopy is distributed unequally** — low-income, predominantly Black neighborhoods have measurably less tree cover.
2. **Impervious surface is concentrated in poorer areas** — more asphalt parking lots, roads, and rooftops absorb and radiate heat.
3. **Housing stock is degraded in the hottest areas** — single-pane windows, substandard insulation, outdated cooling systems.
4. **Historical redlining and housing discrimination** created these spatial patterns and they persist today.

---

## The 5 Recommendations (Dr. Finn's Framework)

These are the **only** interventions the chatbot should recommend. Every city-specific program must map to one of these:

### 1. Protect Mature Canopy
- Stop cutting existing large shade trees on public rights-of-way and in parks
- Enforce stricter tree removal permits in low-canopy neighborhoods
- Include canopy protection in all capital project budgets

### 2. Plant and Maintain Trees Where Heat Exposure Is Greatest
- Target planting in the top 20% hottest block groups (use the project's composite score)
- Prioritize shade trees (large crown, high cooling effect) over ornamentals
- Fund ongoing maintenance (watering year 1–3, pruning) — a dead tree is worse than no tree
- Use the project's ranked list of highest-vulnerability block groups to target

### 3. Shade Sidewalks and Bus Stops in Low-Income Areas
- Install shade structures at bus stops in high-heat, high-poverty corridors
- Paint roads lighter colors (albedo effect) on high-traffic arterials in hot neighborhoods
- Add sidewalk trees along transit corridors
- Prioritize routes serving senior centers, hospitals, and schools

### 4. Improve Rental Housing
- Enforce energy code compliance in rental units (insulation, window quality, AC)
- Weatherization programs that include tenants (not just homeowners)
- Rent subsidies tied to energy efficiency upgrades
- Target single-pane window replacement in pre-1980 rental stock in hottest block groups

### 5. Expand Access to Safe and Affordable Cooling
- Operate cooling centers in the highest-heat neighborhoods during heat warnings (not just city hall or senior centers)
- Utility bill assistance (LIHEAP) targeted to the hottest + poorest block groups
- Free/low-cost AC units or repair programs for income-qualified households
- Ensure cooling centers are near public transit and have accessible hours (6am–10pm)

---

## What the Chatbot Should NOT Do

- **Do not** recommend "everyone should just turn up their AC" without acknowledging energy cost barriers
- **Do not** present heat as a natural or equal threat — it is structurally unequal
- **Do not** recommend programs that don't exist in the selected city (check `programs_by_region.md`)
- **Do not** give generic advice like "plant some trees" without naming the specific city program, eligibility, and how to apply
- **Do not** compare surface temperature classes across cities (class 4 in Richmond ≠ class 4 in Norfolk — they are relative to each city's own mean)

---

## Data Sources Used in the Project

| Dataset | Source | Resolution | Year |
|---------|--------|------------|------|
| Surface temperature anomaly | Trust for Public Land / Landsat 8 | 30 m | 2025 |
| Tree canopy | National Land Cover Database (NLCD) | 30 m | 2021 |
| Impervious surface | NLCD | 30 m | 2021 |
| Demographics (income, race) | U.S. Census Bureau, ACS | block group | 2019–2023 5-yr |
| Poverty ratio | VA DSS / Census | block group | 2024 |

**Heat severity class (1–5):** Relative to each city's own mean. Class 1 = coolest areas in that city; Class 5 = hottest. Classes are NOT comparable across cities.
