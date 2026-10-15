# Validation report

Source files were not modified. Missing measurements were left blank. No composite score was calculated, and heat classes were not converted to temperature.

## Block-group layer comparison

- `tcc_cbg.geojson` rows: 5,963. Duplicate GEOIDs: 0.
- `impervious_cbg.geojson` rows: 5,963. Duplicate GEOIDs: 0.
- GEOID sets equal: True. Only in canopy: 0. Only in impervious: 0.
- Block groups whose five statistics are identical: 8.
- Canopy mean greater than impervious mean: 3,677. Impervious mean greater: 2,278. Means equal: 8.
- Identical groups:
  - `516509901000`: land area 0, water area 155320354, statistics (0.0, 0.0, 0.0, 0.0, 0.0).
  - `517359901000`: land area 0, water area 145664112, statistics (0.0, 0.0, 0.0, 0.0, 0.0).
  - `511999901000`: land area 0, water area 209074904, statistics (0.0, 0.0, 0.0, 0.0, 0.0).
  - `511159901000`: land area 0, water area 317019658, statistics (0.0, 0.0, 0.0, 0.0, 0.0).
  - `511199901000`: land area 0, water area 67987238, statistics (0.0, 0.0, 0.0, 0.0, 0.0).
  - `511039901000`: land area 0, water area 111418739, statistics (0.0, 0.0, 0.0, 0.0, 0.0).
  - `510019902000`: land area 0, water area 986111802, statistics (0.0, 0.0, 0.0, 0.0, 0.0).
  - `511339901000`: land area 0, water area 164264552, statistics (0.0, 0.0, 0.0, 0.0, 0.0).
- Tree-canopy maxima above 100: ['510839304001', '511670304021'].
- Impervious maxima above 100: [].

The two layers are distinct. Eight shared all-zero results are water-only block groups (land area 0), which is a plausible result for both surfaces rather than evidence that the files are copies.

Units are not named inside either GeoJSON. Canopy and impervious values other than the two maxima of 254 fall between 0 and 100, which is consistent with a percent surface. The source raster name, year, and pixel size are not in the files, so the percent unit remains flagged rather than treated as confirmed metadata.

## Tree-canopy maximum of 254

Neither block-group file contains a raster metadata record, a data dictionary, or a pixel histogram. The only canopy attributes are zonal `_mean`, `_median`, `_stdev`, `_min`, and `_max`.

A maximum of 254 means at least one pixel valued 254 was included in the zonal calculation. The mean, standard deviation, and maximum therefore include that value. The median can show whether 254 is typical: a median inside 0–100 means at least half of the pixels are at or below that median, so 254 is not the typical pixel. The files do not record how many pixels equal 254, so the size of the effect on the mean cannot be calculated. The stored values were not changed.

### `510839304001`

- County record: Halifax County (`51083`).
- Block-group name in the canopy file: Block Group 1.
- Land area: 115051467. Water area: 12888359.
- Canopy mean 63.59587041401386, median 84.0, standard deviation 37.038483378077686, minimum 0.0, maximum 254.0.
- Impervious mean for the same GEOID: 0.6882268106510957, maximum 87.0.

### `511670304021`

- County record: Russell County (`51167`).
- Block-group name in the canopy file: Block Group 1.
- Land area: 124805561. Water area: 1270321.
- Canopy mean 57.909363466988374, median 83.0, standard deviation 39.37125037856454, minimum 0.0, maximum 254.0.
- Impervious mean for the same GEOID: 0.7472285079986009, maximum 92.0.

Blocks inside `510839304001`: 70. Blocks whose canopy maximum is 254: 1.
- Block `510839304001049`: mean 11.22228538942581, median 0.0, minimum 0.0, maximum 254.0, land area 224900, population 0.
- Other block maxima in this group: {0.0: 5, 28.0: 1, 71.0: 1, 75.0: 1, 81.0: 1, 90.0: 1, 91.0: 1, 92.0: 1, 93.0: 1, 94.0: 2, 95.0: 3, 96.0: 15, 97.0: 15, 98.0: 19, 99.0: 2}.

Blocks inside `511670304021`: 85. Blocks whose canopy maximum is 254: 1.
- Block `511670304021036`: mean 80.46091008918766, median 88.0, minimum 0.0, maximum 254.0, land area 31883766, population 89.
- Other block maxima in this group: {0.0: 2, 3.0: 1, 17.0: 1, 18.0: 1, 20.0: 1, 29.0: 1, 31.0: 1, 33.0: 1, 38.0: 1, 44.0: 2, 48.0: 1, 49.0: 1, 59.0: 1, 62.0: 1, 63.0: 1, 65.0: 1, 67.0: 2, 68.0: 1, 77.0: 2, 81.0: 1, 83.0: 1, 85.0: 4, 86.0: 3, 87.0: 2, 88.0: 2, 89.0: 3, 90.0: 1, 91.0: 4, 92.0: 1, 93.0: 5, 94.0: 4, 95.0: 4, 96.0: 8, 97.0: 12, 98.0: 6}.

Conclusion for 254: it is outside the 0–100 range of the other canopy maxima. The file does not define it, so it is flagged as an anomalous raster value rather than labeled as confirmed NoData. Because the maximum is 254, that value entered the zonal mean. Both flagged block groups have medians in the 80s, so 254 is not the typical pixel. No replacement mean was calculated.

## Joins

### Block groups

- Income rows before join: 5,963. Duplicate income GEOIDs: 0.
- Heat block-group rows before join: 5,963. Duplicate heat GEOIDs: 0.
- County records: 133. Duplicate county FIPS: 0.
- Income IDs matching canopy IDs: 5,963 of 5,963.
- Heat IDs matching canopy IDs: 5,963 of 5,963.
- Output rows: 5,963. This equals the union of the four ID sets, so no source row was dropped and no ID was repeated.
- Output duplicate GEOIDs: 0.
- Block groups without a county name: 0.
- Land or water area disagreements among canopy, impervious, and heat boundaries: 0.
- Income status counts: {'numeric': 5405, 'insufficient_sample': 354, 'top_coded': 204}.
- Block groups with a missing heat-class mean: 1,630 of 5,963.
- Tree-canopy block groups with maximum 254, retained and flagged: 2 (510839304001, 511670304021).

### Census blocks

- Tree-canopy block rows before join: 163,491. Duplicate block GEOIDs: 0.
- Heat block rows before join: 163,491. Duplicate heat block GEOIDs: 0.
- Impervious block rows before join: 19,520. Duplicate impervious block GEOIDs: 0.
- Heat IDs found in the canopy blocks: 163,491. Heat IDs not in the canopy blocks: 0.
- Impervious block IDs found in the canopy blocks: 19,520. Impervious IDs not in the canopy blocks: 0.
- Output rows: 163,491. Left-join base was the canopy block file, so the output count matches that file.
- Blocks whose first 12 digits do not match a canopy block-group GEOID: 0.
- Blocks with a heat-class value: 71,841. Blocks with a heat geometry but no class value: 91,650.
- Blocks with an impervious-block record: 19,520. Blocks absent from that extract, with blank block-level impervious statistics: 143,971.
- Of the 19,520 matched impervious-block records, 2 have null zonal statistics and those nulls were preserved: `510019901000011` and `510019901000012`. Both are Accomack water blocks with land area 0. `impervious_block_record_present` is yes for those rows, and the statistic fields are blank.
- Blocks with a missing canopy mean: 3. Blocks with canopy maximum 254: 2.
- Blocks that did not inherit a block-group income record: 0.
- Blocks that did not inherit a block-group canopy record: 0.

The block output has one row per canopy-block GEOID. Heat and impervious block records were attached by full 15-digit GEOID. Block-group income, canopy, impervious surface, and heat were attached by the first 12 digits. Those inherited columns repeat the same block-group measurement on every block in the group.

## Assumptions and limits

- A census block GEOID's first 12 characters are its block group GEOID. This is the Census ID construction, and every block in this extract matched a block-group ID in the spatial files.
- Heat values are class codes from 1 to 5. The project definition is that 1 is mildly above the same city's mean and 5 is far above that city's mean, using Jenks natural breaks. A class is not a temperature, and a class in one city is not an absolute comparison with the same class in another city. Zonal means are averages of those class codes.
- `median_household_income_dollars` is blank when the Census code is `-` or `250,000+`. The original code is kept in `median_household_income_code`. The margin-of-error code is kept the same way. The margin is the Census 90 percent margin of error, in 2024 inflation-adjusted dollars, only when it is numeric.
- Income, block-group canopy, block-group impervious surface, and block-group heat are block-group measurements copied onto blocks. They are not block measurements.
- Block-level impervious surface comes from `impervious_census_block.geojson`. Its internal layer name is still `impervious_county_block`, and it contains 19,520 blocks rather than every Virginia block. Unmatched blocks are blank, not zero.
- Land and water area use the Census TIGER `ALAND` and `AWATER` fields, which the Census Bureau defines as square meters. The GeoJSON files do not restate that unit.
- County names come from the county canopy boundary attributes `NAME`, `NAMELSAD`, and `JURISTYPE`, joined on the five-digit county FIPS.
- ACS 2024 block-group IDs matched the TIGER block-group IDs in these files. The ACS geographic vintage and the TIGER file vintage are not the same document, so matching IDs do not prove that every boundary vertex is identical.
- No cost, vulnerability index, or cross-city heat ranking was created.

