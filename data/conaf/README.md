# CONAF fire records, historical Biobío region (2002–2020)

Corporación Nacional Forestal (2024). *Registro histórico de incendios forestales*, V1. Datos para Resiliencia. https://doi.org/10.71578/UXAUN5

Licence: Creative Commons Attribution 4.0 International (CC BY 4.0), as stated on the dataset page (https://datospararesiliencia.cl/dataset.xhtml?persistentId=doi:10.71578/UXAUN5).

This file is the subset for the historical Biobío region (including the former Ñuble province), seasons 2002–03 to 2019–20, as prepared by our team member Karla Palomino. No values were changed. In the analysis, two records with coordinates outside the region are excluded.

## National file: `conaf_incendios_chile_2002_2020.csv.gz`

Same source and licence. All 16 regions, seasons 2002–03 to 2019–20 (18 season files of the dataset joined), prepared by Karla Palomino. 109,947 fires after removing 38 exact duplicate rows; the per-season totals then match the dataset's season index except for those duplicates. Changes, all documented: durations coded −999999.99 set to empty; two cause labels with a missing comma restored; column names in English; a `region` column with today's administrative division (the former Ñuble province, inside Biobío until the 2018–19 season, assigned to the Ñuble region by comuna) next to the original `region_original` and `provincia_original`. Burned areas, dates, coordinates and causes are unchanged.
