# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
# "What is normal" by region: median and MAD by month of the fire season (July to June), on the harmonized
# monthly series in Suomi NPP-equivalent hotspots, plus a robust anomaly for every month.
#
# Harmonized series (per region, 2000-11 to 2026-07, standard data only):
#   2012-02 onwards  Suomi NPP observed                      source = "SNPP"
#   2002-07 to 2012-01  MODIS Aqua mapped to Suomi NPP          source = "Aqua->SNPP (qmap)"
#   2000-11 to 2002-06  MODIS Terra mapped to Suomi NPP         source = "Terra->SNPP (qmap)", less comparable
#   (2012-01 uses Aqua: Suomi NPP data start on 2012-01-20.)
# Maps: qmap::fitQmapQUANT on log(1 + monthly hotspots), all months together, fitted on the whole overlap
# 2012-02 to 2026-07 (the same settings as 07, whose hidden-years test validates them). Raw counts of different
# sensors are never added.
#
# Normal: for each region and calendar month, over the complete seasons 2000-01 to 2025-26 (July 2000 to
# October 2000 have no data, so that season counts only from November):
#   median, MAD (R's mad(), scaled by 1.4826 to be comparable to a standard deviation), 10th and 90th
#   percentiles, number of seasons; the same median from Suomi NPP observations only (2012-13 to 2025-26) as a check.
# Anomaly: robust z on the log scale, z = (log1p(x) - median(log1p)) / MAD(log1p), so that doubling a quiet month
# and doubling a busy month are the same size of anomaly. |z| >= 2 is flagged as unusual.
#
# Usage: Rscript pipeline/09_normal_by_region.R results/model_input/monthly_comuna_counts_chile.csv.gz results/normal [codregion ...]
#        default regions: 8 16 7 9. Packages: qmap (and base R).

suppressPackageStartupMessages(library(qmap))

args <- commandArgs(trailingOnly = TRUE)
src_file <- if (length(args) >= 1) args[1] else "results/model_input/monthly_comuna_counts_chile.csv.gz"
out <- if (length(args) >= 2) args[2] else "results/normal"
REGIONS <- if (length(args) >= 3) as.integer(args[-(1:2)]) else c(8L, 16L, 7L, 9L)
dir.create(out, showWarnings = FALSE, recursive = TRUE)
QSTEP <- 0.05
FIRST <- "2000-11"; END <- "2026-07"; OVERLAP <- c("2012-02", "2026-07")
AQUA_START <- "2002-07"; SNPP_START <- "2012-02"
REGION_NAME <- c(`7` = "Maule", `8` = "Biob\u00edo", `9` = "Araucan\u00eda", `16` = "\u00d1uble")

d <- read.csv(if (grepl("\\.gz$", src_file)) gzfile(src_file) else src_file)
months <- format(seq(as.Date(paste0(FIRST, "-01")), as.Date(paste0(END, "-01")), by = "month"), "%Y-%m")
fit_qm <- function(src, snpp) fitQmapQUANT(log1p(snpp), log1p(src), qstep = QSTEP, wet.day = FALSE)
do_qm <- function(f, src) pmax(expm1(doQmapQUANT(log1p(src), f, type = "linear")), 0)
season_of <- function(m) { y <- as.integer(substr(m, 1, 4)); mo <- as.integer(substr(m, 6, 7))
  s <- ifelse(mo >= 7, y, y - 1); sprintf("%d-%d", s, s + 1) }
month_of_season <- function(m) { mo <- as.integer(substr(m, 6, 7)); ifelse(mo >= 7, mo - 6, mo + 6) }  # 1 = July

series <- do.call(rbind, lapply(REGIONS, function(r) {
  x <- d[d$codregion == r, ]
  cnt <- function(s) { a <- aggregate(n_hotspots ~ month, data = x[x$satellite == s, ], FUN = sum)
    v <- a$n_hotspots[match(months, a$month)]; ifelse(is.na(v), 0, v) }
  terra <- cnt("Terra"); aqua <- cnt("Aqua"); snpp <- cnt("SNPP")
  ov <- months >= OVERLAP[1] & months <= OVERLAP[2]
  f_aqua <- fit_qm(aqua[ov], snpp[ov]); f_terra <- fit_qm(terra[ov], snpp[ov])
  src <- ifelse(months >= SNPP_START, "SNPP", ifelse(months >= AQUA_START, "Aqua->SNPP (qmap)", "Terra->SNPP (qmap)"))
  raw <- ifelse(src == "SNPP", snpp, ifelse(src == "Terra->SNPP (qmap)", terra, aqua))
  val <- ifelse(src == "SNPP", snpp, ifelse(src == "Terra->SNPP (qmap)", do_qm(f_terra, terra), do_qm(f_aqua, aqua)))
  data.frame(zone = sprintf("region_%02d", r), codregion = r, month = months, season = season_of(months),
             month_of_season = month_of_season(months), source = src, source_hotspots = raw,
             snpp_equivalent = val, stringsAsFactors = FALSE)
}))

# ---------- normal by region and month of season ----------
complete <- series$season <= "2025-2026"
normal <- do.call(rbind, lapply(split(series[complete, ], list(series$zone[complete], series$month_of_season[complete])), function(g) {
  s_only <- g$snpp_equivalent[g$source == "SNPP"]
  lg <- log1p(g$snpp_equivalent)
  data.frame(zone = g$zone[1], codregion = g$codregion[1], month_of_season = g$month_of_season[1],
             calendar_month = as.integer(substr(g$month[1], 6, 7)),
             n_seasons = nrow(g), first_season = min(g$season), last_season = max(g$season),
             median = median(g$snpp_equivalent), mad = mad(g$snpp_equivalent),
             p10 = quantile(g$snpp_equivalent, .1, names = FALSE), p90 = quantile(g$snpp_equivalent, .9, names = FALSE),
             median_log1p = median(lg), mad_log1p = mad(lg),
             n_seasons_snpp_only = length(s_only), median_snpp_only = if (length(s_only)) median(s_only) else NA)
}))
normal <- normal[order(normal$zone, normal$month_of_season), ]

# ---------- robust anomaly of every month ----------
key <- paste(series$zone, series$month_of_season)
nk <- match(key, paste(normal$zone, normal$month_of_season))
series$normal_median <- normal$median[nk]
z <- (log1p(series$snpp_equivalent) - normal$median_log1p[nk]) / pmax(normal$mad_log1p[nk], 0.05)
series$robust_z <- z
series$anomaly <- ifelse(z >= 2, "unusually high", ifelse(z <= -2, "unusually low", "within normal"))

r3 <- function(df) { for (j in names(df)) if (is.double(df[[j]])) df[[j]] <- round(df[[j]], 3); df }
write.csv(r3(normal), file.path(out, "normal_by_region.csv"), row.names = FALSE)
write.csv(r3(series), file.path(out, "harmonized_monthly_with_anomaly.csv"), row.names = FALSE)

# ---------- check: does the harmonized normal agree with the Suomi NPP-only normal? ----------
chk <- do.call(rbind, lapply(split(normal, normal$zone), function(g) data.frame(
  zone = g$zone[1], season_total_median_all = sum(g$median), season_total_median_snpp_only = sum(g$median_snpp_only),
  ratio = sum(g$median) / sum(g$median_snpp_only),
  months_within_25pct = sum(abs(g$median / pmax(g$median_snpp_only, 1) - 1) <= .25))))
write.csv(r3(chk), file.path(out, "check_harmonized_vs_snpp_only.csv"), row.names = FALSE)

# ---------- figure (English) ----------
ml <- c("Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun")
png(file.path(out, "normal_by_region.png"), width = 2100, height = 1400, res = 150)
par(mfrow = c(2, 2), mar = c(4, 4.8, 3.2, 1), oma = c(2, 0, 0, 0))
for (zn in unique(normal$zone)) {
  g <- normal[normal$zone == zn, ]; s <- series[series$zone == zn, ]
  cur <- s[s$season == "2025-2026", ]
  rng <- c(1, max(g$p90, cur$snpp_equivalent, g$median_snpp_only, na.rm = TRUE) * 12)
  plot(g$month_of_season, g$median + 1, log = "y", type = "n", ylim = rng, xaxt = "n", xlab = "",
       ylab = "Suomi NPP-equivalent hotspots + 1", main = sprintf("%s (region %d): normal by month of season",
       REGION_NAME[as.character(g$codregion[1])], g$codregion[1]))
  axis(1, at = 1:12, labels = ml)
  abline(h = c(1, 10, 100, 1000, 10000), col = "grey92")
  polygon(c(g$month_of_season, rev(g$month_of_season)), c(g$p10, rev(g$p90)) + 1, col = adjustcolor("#2f9e44", .15), border = NA)
  lo <- pmax(g$median - g$mad, 0); hi <- g$median + g$mad
  polygon(c(g$month_of_season, rev(g$month_of_season)), c(lo, rev(hi)) + 1, col = adjustcolor("#2f9e44", .25), border = NA)
  lines(g$month_of_season, g$median + 1, col = "#2f9e44", lwd = 2.2)
  lines(g$month_of_season, g$median_snpp_only + 1, col = "#495057", lty = 2)
  pc <- ifelse(cur$anomaly == "unusually high", "#d9480f", ifelse(cur$anomaly == "unusually low", "#1c7ed6", "#212529"))
  points(cur$month_of_season, cur$snpp_equivalent + 1, pch = 19, col = pc)
  legend("topleft", bty = "n", cex = .8, ncol = 2,
         legend = c("Median, 2000-01 to 2025-26 (harmonized)", "Median, Suomi NPP only (2012-13 to 2025-26)",
                    "Median +/- MAD", "10th-90th percentile", "Season 2025-26", "2025-26, unusual (|z| >= 2)"),
         col = c("#2f9e44", "#495057", adjustcolor("#2f9e44", .4), adjustcolor("#2f9e44", .2), "#212529", "#d9480f"),
         lty = c(1, 2, 1, 1, NA, NA), lwd = c(2.2, 1, 8, 8, NA, NA), pch = c(NA, NA, NA, NA, 19, 19))
}
mtext(paste("Fire season July to June. Before 2012: MODIS Aqua (from 2002-07) and Terra (2000-11 to 2002-06) mapped to Suomi NPP with qmap.",
            "MAD scaled by 1.4826. Data: NASA FIRMS standard, type 0, low confidence removed."),
      side = 1, outer = TRUE, line = .5, cex = .7, col = "grey40")
invisible(dev.off())

print(r3(chk), row.names = FALSE)
print(r3(normal[normal$zone == "region_08", c("month_of_season", "calendar_month", "n_seasons", "median", "mad", "p10", "p90", "median_snpp_only")]), row.names = FALSE)
cat("Anomalies |z|>=2 by zone:\n"); print(table(series$zone, series$anomaly))
