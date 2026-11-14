# Overlap

**Two satellites. One honest burning calendar.**

Overlap harmonizes 25 years of NASA FIRMS active-fire hotspots from MODIS (1 km) and VIIRS (375 m) into one consistent burning activity calendar for any area of interest, and shows how much to trust each number.

NASA Space Apps Challenge 2026 · Challenge: *Harmonization of MODIS and VIIRS Hot Spots* · Local event: Concepción, Chile.

> **Design principle:** nothing is shown without its uncertainty, and no detection is not the same as no fire.

> Work in progress during the hackathon (November 14–15, 2026).

## In two minutes

| | |
| --- | --- |
| **Problem** | Satellites have tracked active fires for 25 years, but the record is split between MODIS (since 2000) and VIIRS (since 2012). VIIRS sees smaller fires: in Biobío, Chile, it records about 4.8 times more hotspots than MODIS Aqua for the same months. Joining both series without treatment creates a false jump in 2012. MODIS ends in 2027 and Suomi NPP stopped delivering new data on November 2, 2026. |
| **For whom** | Early warning and emergency responders, firefighters, scientists and land managers. |
| **Solution** | A harmonization engine calibrated on the MODIS–VIIRS overlap, and a web app with a month × year calendar, the current month against the historical median, anomalies and a CSV download for any area. |
| **Measured result** | Biobío, fitted on 2012–2019 and tested on hidden years 2020–2026: reconstructing monthly Suomi NPP counts from MODIS Aqua, the mean error falls from 890 hotspots (no harmonization) and 326 (simple ratio) to 176 with quantile mapping; from MODIS Terra, from 994 and 649 to 407. Details and limitations in [results/harmonization](results/harmonization/README.md). |
| **Try it** | *Link to the published app, coming soon.* |

## Repository

| Folder | Content |
| --- | --- |
| `pipeline/` | Python scripts, run in order (`01_…`, `02_…`) |
| `results/` | Tables and figures produced by the pipeline; every number in our submission comes from here |
| `app/` | Static web app (no server, no login) |
| `docs/` | Data sources, method and AI use |
| `data/` | Raw FIRMS downloads (not committed; see `data/README.md`) |

## First result

![Biobío: MODIS Aqua vs VIIRS Suomi NPP monthly hotspots, 2012–2026](results/fig01_biobio_aqua_vs_snpp.png)

Same fires, different counts: both sensors rise and fall together, but VIIRS records about 4.8 times more hotspots. The ratio is not constant: it is larger in quiet months and smaller in big fire months, so a single fixed factor is not enough.

## Data processing rules

1. Only standard (science-quality) FIRMS data in the historical series; the last 2–3 months (near real-time) are marked as provisional.
2. Only `type = 0` (presumed vegetation fire). Volcanoes, static land sources (mining, industry) and offshore detections are removed.
3. Low-confidence detections are removed (MODIS < 30, VIIRS "low").
4. Dates and times in UTC.
5. Raw counts from different sensors are never added together, and VIIRS satellites are never summed with each other.

## Team

Overlap: Matías Navarro, Karla Palomino, Benjamín Arriagada.

## Data and acknowledgments

We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (https://earthdata.nasa.gov/firms), part of NASA's Earth Science Data and Information System (ESDIS). Details in [docs/DATA.md](docs/DATA.md). AI use is declared in [docs/AI_USE.md](docs/AI_USE.md).
