# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
# Validation against CONAF extended to all 16 regions, seasons 2002-03 to 2019-20.
#
# Harmonized monthly series (Suomi NPP-equivalent, 2002-07 to 2020-06):
#   Maule, Biobío, Araucanía, Ñuble: their own quantile maps (results/normal, from 09);
#   the other 12 regions: the pooled quantile map of those four regions (as in 11, fitted on the whole overlap).
#   Alternative for the other 12: each region's own simple ratio over the whole overlap.
# For every region and for groups of regions:
#   jump at the 2012 sensor change (as in 10): exp(era coefficient) of the region-month regression
#     log(1 + hotspots) ~ log(1 + CONAF area) + log(1 + CONAF fires) + calendar month [+ region] + era;
#     95 % CI by bootstrap over fire seasons (1,000 replicates);
#   Spearman correlation of monthly hotspots with CONAF fires and area, by era and over 2002-2020;
#   coarse hit rate of fires >= 200 ha (a hotspot in the same comuna and month).
# Regions with fewer than 200 CONAF fires in 2002-2020 are reported but flagged: too few records to judge.
#
# Usage: Rscript pipeline/15_conaf_validation_all_regions.R data/conaf/conaf_incendios_chile_2002_2020.csv.gz \
#          results/normal/harmonized_monthly_with_anomaly.csv results/model_input/monthly_comuna_counts_chile.csv.gz \
#          results/model_input/comunas_lookup.csv results/validation_conaf/all_regions
# Packages: qmap (and base R).

suppressPackageStartupMessages(library(qmap))
args <- commandArgs(trailingOnly = TRUE)
rd <- function(f) read.csv(if (grepl("\\.gz$", f)) gzfile(f) else f, encoding = "UTF-8", stringsAsFactors = FALSE)
conaf <- rd(args[1]); harm4 <- rd(args[2]); counts <- rd(args[3]); lookup <- rd(args[4]); out <- args[5]
dir.create(out, showWarnings = FALSE, recursive = TRUE)
set.seed(2026)
B <- 1000; MIN_FIRES <- 200
CAL <- c(7L, 8L, 9L, 16L)
START <- "2002-07"; END <- "2020-06"; SNPP_START <- "2012-02"; OVERLAP <- c("2012-02", "2026-07")
REGION_NAME <- c(`1` = "Tarapac\u00e1", `2` = "Antofagasta", `3` = "Atacama", `4` = "Coquimbo", `5` = "Valpara\u00edso",
                 `6` = "O'Higgins", `7` = "Maule", `8` = "Biob\u00edo", `9` = "Araucan\u00eda", `10` = "Los Lagos",
                 `11` = "Ays\u00e9n", `12` = "Magallanes", `13` = "Metropolitana", `14` = "Los R\u00edos",
                 `15` = "Arica y Parinacota", `16` = "\u00d1uble")
REGIONS <- as.integer(names(REGION_NAME))
months <- format(seq(as.Date(paste0(START, "-01")), as.Date(paste0(END, "-01")), by = "month"), "%Y-%m")
season_of <- function(m) { y <- as.integer(substr(m, 1, 4)); s <- ifelse(as.integer(substr(m, 6, 7)) >= 7, y, y - 1); sprintf("%d-%d", s, s + 1) }

# ---------- CONAF comunas -> codes (accents removed explicitly; spelling variants mapped) ----------
norm <- function(s) tolower(trimws(chartr("\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00f1\u00c1\u00c9\u00cd\u00d3\u00da\u00dc\u00d1",
                                          "aeiouunAEIOUUN", enc2utf8(s))))
ALIAS <- c("aisen" = "aysen", "coihaique" = "coyhaique", "villa o\"higgins" = "o'higgins", "paiguano" = "paihuano",
           "cabo de hornos (ex-navarino)" = "cabo de hornos", "llay-llay" = "llaillay")
lookup$k <- norm(lookup$Comuna)
conaf$k <- norm(conaf$comuna)
conaf$k <- ifelse(conaf$k %in% names(ALIAS), ALIAS[conaf$k], conaf$k)
# O'Higgins is both a comuna of Ays\u00e9n and a region: match comuna names within the CONAF region
conaf$cod_comuna <- lookup$cod_comuna[match(conaf$k, lookup$k)]
conaf$codregion <- lookup$codregion[match(conaf$k, lookup$k)]
if (any(is.na(conaf$codregion))) stop("CONAF comunas without a code: ", paste(unique(conaf$comuna[is.na(conaf$codregion)]), collapse = ", "))
conaf$month <- substr(conaf$fecha, 1, 7)
conaf <- conaf[conaf$month >= START & conaf$month <= END, ]
cat("CONAF fires:", nrow(conaf), "\n")

# ---------- monthly hotspots per region and sensor ----------
cnt <- aggregate(n_hotspots ~ codregion + month + satellite, data = counts[counts$satellite %in% c("Aqua", "SNPP"), ], FUN = sum)
allm <- format(seq(as.Date("2002-07-01"), as.Date(paste0(OVERLAP[2], "-01")), by = "month"), "%Y-%m")
get <- function(r, s, mm) { x <- cnt[cnt$codregion == r & cnt$satellite == s, ]; v <- x$n_hotspots[match(mm, x$month)]; ifelse(is.na(v), 0, v) }
fit_qm <- function(src, snpp) fitQmapQUANT(log1p(snpp), log1p(src), qstep = 0.05, wet.day = FALSE)
do_qm <- function(f, src) pmax(expm1(doQmapQUANT(log1p(src), f, type = "linear")), 0)
ov <- allm >= OVERLAP[1] & allm <= OVERLAP[2]
pool_src <- unlist(lapply(CAL, function(r) get(r, "Aqua", allm)[ov])); pool_snpp <- unlist(lapply(CAL, function(r) get(r, "SNPP", allm)[ov]))
f_pool <- fit_qm(pool_src, pool_snpp)

tab <- do.call(rbind, lapply(REGIONS, function(r) {
  aqua <- get(r, "Aqua", months); snpp <- get(r, "SNPP", months)
  era <- months >= SNPP_START
  k_own <- sum(get(r, "SNPP", allm)[ov]) / max(sum(get(r, "Aqua", allm)[ov]), 1)
  harm <- if (r %in% CAL) harm4$snpp_equivalent[match(paste(r, months), paste(harm4$codregion, harm4$month))] else
    ifelse(era, snpp, do_qm(f_pool, aqua))
  cf <- conaf[conaf$codregion == r, ]
  data.frame(codregion = r, month = months, season = season_of(months), cal_month = substr(months, 6, 7),
             era_snpp = as.integer(era),
             conaf_fires = as.numeric(table(factor(cf$month, levels = months))),
             conaf_ha = { a <- tapply(cf$sup_total_ha, factor(cf$month, levels = months), sum); ifelse(is.na(a), 0, a) },
             hot_raw = ifelse(era, snpp, aqua), hot_ratio_own = ifelse(era, snpp, aqua * k_own),
             hot_harmonized = harm, map = if (r %in% CAL) "own quantile map" else "pooled quantile map")
}))
tab$cal_month <- factor(tab$cal_month); tab$region <- factor(tab$codregion)

jump1 <- function(dat, y) {
  f <- if (length(unique(dat$codregion)) > 1) log1p(dat[[y]]) ~ log1p(conaf_ha) + log1p(conaf_fires) + region + cal_month + era_snpp else
    log1p(dat[[y]]) ~ log1p(conaf_ha) + log1p(conaf_fires) + cal_month + era_snpp
  unname(exp(coef(lm(f, data = dat))["era_snpp"]))
}
seasons <- unique(tab$season)
scopes <- c(setNames(as.list(REGIONS), paste0("region_", sprintf("%02d", REGIONS))),
            list(calibrated_4 = CAL, other_12 = setdiff(REGIONS, CAL), other_12_with_200_fires_or_more = NULL, all_16 = REGIONS))
nf <- tapply(conaf$codregion, conaf$codregion, length)
scopes$other_12_with_200_fires_or_more <- setdiff(REGIONS[REGIONS %in% as.integer(names(nf)[nf >= MIN_FIRES])], CAL)
series <- c(hot_raw = "unharmonized", hot_ratio_own = "own simple ratio", hot_harmonized = "quantile map")
rows <- list()
for (sc in names(scopes)) {
  dat <- tab[tab$codregion %in% scopes[[sc]], ]
  n_f <- sum(dat$conaf_fires)
  for (y in names(series)) {
    if (y == "hot_ratio_own" && all(scopes[[sc]] %in% CAL)) next
    est <- jump1(dat, y)
    bs <- replicate(B, { s <- sample(seasons, length(seasons), replace = TRUE); jump1(do.call(rbind, lapply(s, function(z) dat[dat$season == z, ])), y) })
    w <- dat[dat$month >= START, ]
    rows[[length(rows) + 1]] <- data.frame(scope = sc,
      name = if (grepl("^region_", sc)) REGION_NAME[as.character(scopes[[sc]])] else sc,
      map = if (grepl("^region_", sc)) dat$map[1] else "", conaf_fires = n_f, enough_conaf_fires = n_f >= MIN_FIRES,
      series = series[[y]], jump_factor_at_2012 = est,
      ci95_low = quantile(bs, .025, names = FALSE, na.rm = TRUE), ci95_high = quantile(bs, .975, names = FALSE, na.rm = TRUE),
      spearman_area_2002_2020 = suppressWarnings(cor(w[[y]], w$conaf_ha, method = "spearman")),
      spearman_fires_2002_2020 = suppressWarnings(cor(w[[y]], w$conaf_fires, method = "spearman")))
  }
}
res <- do.call(rbind, rows); rownames(res) <- NULL

# Spearman within each era (same ranks for every series within an era) and coarse hit rate of fires >= 200 ha
cc <- aggregate(n_hotspots ~ cod_comuna + month + satellite, data = counts[counts$satellite %in% c("Aqua", "SNPP"), ], FUN = sum)
kf <- paste(conaf$cod_comuna, conaf$month)
for (s in c("Aqua", "SNPP")) { x <- cc[cc$satellite == s, ]; v <- x$n_hotspots[match(kf, paste(x$cod_comuna, x$month))]; conaf[[paste0("hit_", s)]] <- !is.na(v) & v > 0 }
era_rows <- do.call(rbind, lapply(REGIONS, function(r) {
  d <- tab[tab$codregion == r, ]; a <- d[d$era_snpp == 0, ]; b <- d[d$era_snpp == 1, ]
  big <- conaf[conaf$codregion == r & conaf$sup_total_ha >= 200, ]
  data.frame(zone = sprintf("region_%02d", r), name = REGION_NAME[as.character(r)], conaf_fires = sum(d$conaf_fires),
             spearman_area_aqua_era = suppressWarnings(cor(a$hot_raw, a$conaf_ha, method = "spearman")),
             spearman_area_snpp_era = suppressWarnings(cor(b$hot_raw, b$conaf_ha, method = "spearman")),
             fires_200ha = nrow(big),
             hit_rate_200ha_aqua_2002_2012 = if (any(big$month < SNPP_START)) mean(big$hit_Aqua[big$month < SNPP_START]) else NA,
             hit_rate_200ha_snpp_2012_2020 = if (any(big$month >= SNPP_START)) mean(big$hit_SNPP[big$month >= SNPP_START]) else NA)
}))

r3 <- function(df) { for (j in names(df)) if (is.double(df[[j]])) df[[j]] <- round(df[[j]], 3); df }
write.csv(r3(res), file.path(out, "jump_at_2012_all_regions.csv"), row.names = FALSE, fileEncoding = "UTF-8")
write.csv(r3(era_rows), file.path(out, "spearman_hit_rate_all_regions.csv"), row.names = FALSE, fileEncoding = "UTF-8")
write.csv(r3(tab[, c("codregion", "month", "season", "conaf_fires", "conaf_ha", "hot_raw", "hot_ratio_own", "hot_harmonized", "map")]),
          file.path(out, "region_month_all_regions.csv"), row.names = FALSE)

# ---------- figure: jump by region, unharmonized vs own ratio vs quantile map ----------
reg_rows <- res[grepl("^region_", res$scope), ]
ord <- REGIONS[order(-REGIONS %in% CAL, REGIONS)]
ord <- c(ord[ord %in% CAL], sort(setdiff(REGIONS, CAL), decreasing = FALSE))
lab <- sapply(ord, function(r) { n <- reg_rows$conaf_fires[reg_rows$scope == sprintf("region_%02d", r)][1]
  sprintf("%s%s (%s fires)", REGION_NAME[as.character(r)], if (r %in% CAL) " *" else "", format(n, big.mark = ",")) })
png(file.path(out, "jump_at_2012_all_regions.png"), width = 1800, height = 1500, res = 150)
par(mar = c(5, 15, 4, 1))
yy <- rev(seq_along(ord))
plot(NA, xlim = c(0.1, 40), ylim = c(0.5, length(ord) + .5), log = "x", yaxt = "n", ylab = "",
     xlab = "Jump in hotspots per unit of CONAF fire activity at 2012 (x, log scale)",
     main = "False jump at the 2012 sensor change, by region (CONAF 2002-2020)")
axis(2, at = yy, labels = lab, las = 1, cex.axis = .8)
abline(v = 1, lty = 2, col = "grey40"); abline(h = length(ord) - 3.5, col = "grey80")
cols <- c("unharmonized" = "#1c7ed6", "own simple ratio" = "#b197fc", "quantile map" = "#2f9e44")
offs <- c("unharmonized" = .22, "own simple ratio" = 0, "quantile map" = -.22)
for (i in seq_along(ord)) {
  z <- reg_rows[reg_rows$scope == sprintf("region_%02d", ord[i]), ]
  for (s in names(cols)) { j <- z[z$series == s, ]; if (!nrow(j)) next
    a <- if (j$enough_conaf_fires) 1 else .35
    segments(max(j$ci95_low, .1), yy[i] + offs[s], min(j$ci95_high, 40), yy[i] + offs[s], col = adjustcolor(cols[s], a), lwd = 2)
    points(j$jump_factor_at_2012, yy[i] + offs[s], pch = 19, col = adjustcolor(cols[s], a)) }
}
legend("bottomright", bty = "n", pch = 19, col = cols, legend = c("Unharmonized", "Own simple ratio", "Quantile map"), cex = .85)
mtext("* calibrated region (own map); others use the map pooled from the four calibrated regions. Faded: fewer than 200 CONAF fires.",
      side = 1, line = 3.8, cex = .7, col = "grey40")
invisible(dev.off())

print(r3(res[, c("scope", "name", "conaf_fires", "series", "jump_factor_at_2012", "ci95_low", "ci95_high", "spearman_area_2002_2020")]), row.names = FALSE)
print(r3(era_rows), row.names = FALSE)
