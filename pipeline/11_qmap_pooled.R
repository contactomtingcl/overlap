# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
# Pooled quantile map: the four calibrated regions together (Maule 7, Biobío 8, Araucanía 9, Ñuble 16), to replace the
# simple ratio in the other regions. The leave-one-region-out test in 08 showed that the Aqua map transfers well.
#
# Fit: qmap::fitQmapQUANT on log(1 + monthly hotspots) of the region-months of the four regions pooled
# (qstep 0.05, wet.day FALSE, all months together), each sensor directly against Suomi NPP, as in 07.
# Output: the same quantile-table format as 07 (zone, season_group, sensor, fit_period, quantile, sensor_value,
# snpp_value), zone = "pooled_regions_07_08_09_16", for the fitting period of the test and for the whole overlap.
# Test: the map fitted on the four regions in the fitting years is applied to each of the OTHER regions in the test
# years (out of sample in space and time), against no harmonization, that region's own simple ratio and the pooled
# simple ratio. Metrics: MAE of log(1 + hotspots), typical factor = exp(median |log error|), total bias.
# The map is for region-month counts: apply it to each region and add the harmonized results, never to a national total.
#
# Usage: Rscript pipeline/11_qmap_pooled.R results/model_input/monthly_comuna_counts_chile.csv.gz results/harmonization_qmap/pooled
# Packages: qmap (and base R).

suppressPackageStartupMessages(library(qmap))
args <- commandArgs(trailingOnly = TRUE)
src_file <- if (length(args) >= 1) args[1] else "results/model_input/monthly_comuna_counts_chile.csv.gz"
out <- if (length(args) >= 2) args[2] else "results/harmonization_qmap/pooled"
dir.create(out, showWarnings = FALSE, recursive = TRUE)
QSTEP <- 0.05; POOL <- c(7L, 8L, 9L, 16L); ZONE <- "pooled_regions_07_08_09_16"
PERIODS <- list(Aqua = c("2012-02", "2019-12", "2020-01", "2026-07"),
                Terra = c("2012-02", "2019-12", "2020-01", "2026-07"),
                NOAA20 = c("2018-04", "2022-12", "2023-01", "2026-07"),
                NOAA21 = c("2023-03", "2024-12", "2025-01", "2026-07"))
d <- read.csv(if (grepl("\\.gz$", src_file)) gzfile(src_file) else src_file)
regions <- setdiff(sort(unique(d$codregion)), 0)  # 0 = hotspots with no comuna (offshore or border), not a region
fit_qm <- function(src, snpp) fitQmapQUANT(log1p(snpp), log1p(src), qstep = QSTEP, wet.day = FALSE)
do_qm <- function(f, src) pmax(expm1(doQmapQUANT(log1p(src), f, type = "linear")), 0)

monthly_region <- function(region, sensor) {
  p <- PERIODS[[sensor]]
  months <- format(seq(as.Date(paste0(p[1], "-01")), as.Date(paste0(p[4], "-01")), by = "month"), "%Y-%m")
  x <- d[d$codregion == region & d$satellite %in% c(sensor, "SNPP"), ]
  get <- function(s) { y <- x[x$satellite == s, ]
    if (!nrow(y)) return(rep(0, length(months)))
    a <- aggregate(n_hotspots ~ month, data = y, FUN = sum); v <- a$n_hotspots[match(months, a$month)]; ifelse(is.na(v), 0, v) }
  data.frame(codregion = region, month = months, src = get(sensor), snpp = get("SNPP"),
             fit = months <= p[2], test = months >= p[3])
}

qrows <- list(); trows <- list()
for (sensor in names(PERIODS)) {
  p <- PERIODS[[sensor]]
  all <- do.call(rbind, lapply(regions, monthly_region, sensor = sensor))
  pool <- all[all$codregion %in% POOL, ]
  f_fit <- fit_qm(pool$src[pool$fit], pool$snpp[pool$fit])
  f_full <- fit_qm(pool$src, pool$snpp)
  for (fp in list(list(f_fit, paste(p[1], p[2], sep = "_")), list(f_full, paste(p[1], p[4], sep = "_"))))
    qrows[[length(qrows) + 1]] <- data.frame(zone = ZONE, season_group = "all_year", sensor = sensor, fit_period = fp[[2]],
      quantile = seq(0, 1, by = QSTEP), sensor_value = expm1(fp[[1]]$par$modq[, 1]), snpp_value = expm1(fp[[1]]$par$fitq[, 1]))
  k_pool <- sum(pool$snpp[pool$fit]) / sum(pool$src[pool$fit])
  for (r in setdiff(regions, POOL)) {
    a <- all[all$codregion == r, ]; te <- a[a$test, ]; fi <- a[a$fit, ]
    if (sum(te$snpp) == 0) next
    k_own <- if (sum(fi$src) > 0) sum(fi$snpp) / sum(fi$src) else NA
    preds <- list(raw = te$src, ratio_own_region = te$src * k_own, ratio_pooled = te$src * k_pool,
                  qmap_pooled = do_qm(f_fit, te$src))
    for (m in names(preds)) {
      pr <- preds[[m]]; if (any(is.na(pr))) next
      le <- log1p(pr) - log1p(te$snpp)
      trows[[length(trows) + 1]] <- data.frame(zone = sprintf("region_%02d", r), sensor = sensor, method = m,
        fit_period = paste(p[1], p[2], sep = "_"), test_period = paste(p[3], p[4], sep = "_"), months = nrow(te),
        snpp_hotspots_test = sum(te$snpp), mae_log1p = mean(abs(le)), typical_factor = exp(median(abs(le))),
        bias_total_pct = 100 * (sum(pr) - sum(te$snpp)) / sum(te$snpp))
    }
  }
}
quant <- do.call(rbind, qrows); test <- do.call(rbind, trows)
r4 <- function(df) { for (j in names(df)) if (is.double(df[[j]])) df[[j]] <- round(df[[j]], 4); df }
write.csv(r4(quant), file.path(out, "quantiles_pooled.csv"), row.names = FALSE)
write.csv(r4(test), file.path(out, "test_other_regions.csv"), row.names = FALSE)

# summary: in how many other regions does the pooled map beat each region's own ratio?
summ <- do.call(rbind, lapply(names(PERIODS), function(s) {
  x <- test[test$sensor == s, ]; w <- reshape(x[, c("zone", "method", "mae_log1p")], idvar = "zone", timevar = "method", direction = "wide")
  data.frame(sensor = s, regions = nrow(w),
             median_mae_raw = median(w$mae_log1p.raw), median_mae_ratio_own = median(w$mae_log1p.ratio_own_region, na.rm = TRUE),
             median_mae_ratio_pooled = median(w$mae_log1p.ratio_pooled), median_mae_qmap_pooled = median(w$mae_log1p.qmap_pooled),
             regions_qmap_pooled_beats_ratio_own = sum(w$mae_log1p.qmap_pooled < w$mae_log1p.ratio_own_region, na.rm = TRUE))
}))
write.csv(r4(summ), file.path(out, "test_other_regions_summary.csv"), row.names = FALSE)

# figure: Aqua and Terra, MAE log1p by region, own ratio vs pooled qmap
png(file.path(out, "pooled_map_other_regions.png"), width = 2100, height = 950, res = 150)
par(mfrow = c(1, 2), mar = c(5, 4.8, 3.5, 1))
for (s in c("Aqua", "Terra")) {
  x <- test[test$sensor == s & test$method %in% c("ratio_own_region", "qmap_pooled"), ]
  m <- with(x, tapply(mae_log1p, list(method, zone), mean))[c("ratio_own_region", "qmap_pooled"), , drop = FALSE]
  nm <- sub("region_", "R", colnames(m))
  barplot(m, beside = TRUE, names.arg = nm, las = 2, col = c("#b197fc", "#2f9e44"), border = NA, ylim = c(0, max(m, na.rm = TRUE) * 1.25),
          ylab = "MAE of log(1 + hotspots), test years", main = sprintf("MODIS %s -> Suomi NPP in the other 12 regions", s))
  legend("topleft", bty = "n", cex = .85, fill = c("#b197fc", "#2f9e44"), border = NA,
         legend = c("Simple ratio of the region itself", "Quantile map pooled from regions 7, 8, 9, 16"))
}
mtext("Fit 2012-02 to 2019-12, test 2020-01 to 2026-07. Region codes as in the official division. Data: NASA FIRMS.",
      side = 1, outer = TRUE, line = -1, cex = .7, col = "grey40")
invisible(dev.off())
print(r4(summ), row.names = FALSE)
print(r4(test[test$sensor == "Aqua", c("zone", "method", "snpp_hotspots_test", "mae_log1p", "typical_factor", "bias_total_pct")]), row.names = FALSE)
