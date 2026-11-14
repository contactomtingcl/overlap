# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
# Equivalence v1 by zone: (1) gathers the per-region, per-sensor outputs of 07_qmap_monthly_region.R into
# one metrics table and one quantile table, and (2) runs a leave-one-region-out test of quantile mapping.
#
# Leave-one-region-out (spatial and temporal out-of-sample at once): for each held-out region, qmap is fitted
# on the monthly counts of the OTHER regions pooled (fitting years only) and applied to the held-out region in
# its test years. It is compared with the region's own qmap and own ratio (from 07) and with a pooled ratio.
# If the pooled map is close to the region's own map, the method transfers to regions where it was not fitted.
#
# Usage: Rscript pipeline/08_qmap_regions_summary_loro.R results/model_input/monthly_comuna_counts_chile.csv.gz results/harmonization_qmap
#        (run 07 first for every region and sensor; regions and sensors are read from the folder names)
# Packages: qmap (and base R).

suppressPackageStartupMessages(library(qmap))

args <- commandArgs(trailingOnly = TRUE)
src_file <- if (length(args) >= 1) args[1] else "results/model_input/monthly_comuna_counts_chile.csv.gz"
out <- if (length(args) >= 2) args[2] else "results/harmonization_qmap"
QSTEP <- 0.05
PERIODS <- list(Aqua = c("2012-02", "2019-12", "2020-01", "2026-07"),
                Terra = c("2012-02", "2019-12", "2020-01", "2026-07"))

# ---------- (1) combined tables ----------
dirs <- list.dirs(out, recursive = FALSE)
dirs <- dirs[grepl("^region_[0-9]+_", basename(dirs))]
metrics <- do.call(rbind, lapply(dirs, function(d) read.csv(file.path(d, "metrics.csv"))))
quantiles <- do.call(rbind, lapply(dirs, function(d) read.csv(file.path(d, "quantiles.csv"))))
metrics <- metrics[order(metrics$zone, metrics$sensor, metrics$method), ]
quantiles <- quantiles[order(quantiles$zone, quantiles$sensor, quantiles$fit_period, quantiles$season_group, quantiles$quantile), ]
write.csv(metrics, file.path(out, "metrics_all.csv"), row.names = FALSE)
write.csv(quantiles, file.path(out, "quantiles_all.csv"), row.names = FALSE)

# ---------- (2) leave-one-region-out ----------
d <- read.csv(if (grepl("\\.gz$", src_file)) gzfile(src_file) else src_file)
regions <- sort(unique(as.integer(sub("^region_([0-9]+)_.*", "\\1", basename(dirs)))))
monthly_region <- function(region, sensor) {
  p <- PERIODS[[sensor]]
  months <- format(seq(as.Date(paste0(p[1], "-01")), as.Date(paste0(p[4], "-01")), by = "month"), "%Y-%m")
  x <- d[d$codregion == region & d$satellite %in% c(sensor, "SNPP"), ]
  a <- aggregate(n_hotspots ~ month + satellite, data = x, FUN = sum)
  get <- function(s) { y <- a[a$satellite == s, ]; v <- y$n_hotspots[match(months, y$month)]; ifelse(is.na(v), 0, v) }
  data.frame(region = region, month = months, src = get(sensor), snpp = get("SNPP"),
             fit = months <= p[2], test = months >= p[3])
}
fit_qm <- function(src, snpp) fitQmapQUANT(log1p(snpp), log1p(src), qstep = QSTEP, wet.day = FALSE)
do_qm <- function(f, src) pmax(expm1(doQmapQUANT(log1p(src), f, type = "linear")), 0)
score <- function(o, p) c(mae_log1p = mean(abs(log1p(p) - log1p(o))),
                          bias_log1p = mean(log1p(p) - log1p(o)),
                          bias_total_pct = 100 * (sum(p) - sum(o)) / sum(o),
                          mae_hotspots = mean(abs(p - o)))

loro <- do.call(rbind, lapply(names(PERIODS), function(sensor) {
  all <- do.call(rbind, lapply(regions, monthly_region, sensor = sensor))
  do.call(rbind, lapply(regions, function(r) {
    others <- all[all$region != r & all$fit, ]
    own_fit <- all[all$region == r & all$fit, ]
    test <- all[all$region == r & all$test, ]
    preds <- list(qmap_pooled_other_regions = do_qm(fit_qm(others$src, others$snpp), test$src),
                  ratio_pooled_other_regions = test$src * sum(others$snpp) / sum(others$src),
                  qmap_own_region = do_qm(fit_qm(own_fit$src, own_fit$snpp), test$src),
                  ratio_own_region = test$src * sum(own_fit$snpp) / sum(own_fit$src))
    do.call(rbind, lapply(names(preds), function(m)
      data.frame(held_out_zone = sprintf("region_%02d", r), sensor = sensor, method = m,
                 fitted_on = if (grepl("pooled", m)) paste(sprintf("region_%02d", setdiff(regions, r)), collapse = "+")
                             else sprintf("region_%02d", r),
                 fit_period = paste(PERIODS[[sensor]][1], PERIODS[[sensor]][2], sep = "_"),
                 test_period = paste(PERIODS[[sensor]][3], PERIODS[[sensor]][4], sep = "_"),
                 months = nrow(test), t(score(test$snpp, preds[[m]])))))
  }))
}))
r4 <- function(df) { for (j in names(df)) if (is.double(df[[j]])) df[[j]] <- round(df[[j]], 4); df }
write.csv(r4(loro), file.path(out, "leave_one_region_out.csv"), row.names = FALSE)

# ---------- figure: MAE log1p, own-region vs pooled-other-regions, Aqua and Terra ----------
png(file.path(out, "leave_one_region_out.png"), width = 1800, height = 900, res = 150)
par(mfrow = c(1, 2), mar = c(5, 4.5, 3.5, 1))
labs <- c(region_07 = "Maule", region_08 = "Biob\u00edo", region_09 = "Arauc.", region_16 = "\u00d1uble")
for (sensor in names(PERIODS)) {
  x <- loro[loro$sensor == sensor, ]
  m <- with(x, tapply(mae_log1p, list(method, held_out_zone), mean))
  m <- m[c("ratio_own_region", "qmap_own_region", "ratio_pooled_other_regions", "qmap_pooled_other_regions"), ]
  barplot(m, beside = TRUE, names.arg = labs[colnames(m)], ylim = c(0, max(m) * 1.25),
          col = c("#b197fc", "#2f9e44", "#e5dbff", "#b2f2bb"), border = NA,
          ylab = "MAE of log(1 + hotspots), test years", main = sprintf("MODIS %s -> Suomi NPP, held-out region", sensor))
  legend("topleft", bty = "n", cex = .8, fill = c("#b197fc", "#2f9e44", "#e5dbff", "#b2f2bb"), border = NA,
         legend = c("Ratio, own region", "Quantile mapping, own region",
                    "Ratio, fitted on the other regions", "Quantile mapping, fitted on the other regions"))
}
mtext("Fit 2012-02 to 2019-12, test 2020-01 to 2026-07. Regions by official boundary (comunas). Data: NASA FIRMS.",
      side = 1, line = -1, outer = TRUE, cex = .7, col = "grey40")
invisible(dev.off())

print(r4(loro[, c("held_out_zone", "sensor", "method", "mae_log1p", "bias_total_pct")]), row.names = FALSE)
