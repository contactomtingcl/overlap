# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
# Harmonization with the R package qmap: monthly MODIS -> VIIRS Suomi NPP counts for one region,
# with a hidden-years test.
#
# Data: results/model_input/monthly_comuna_counts_chile.csv.gz, filtered to one region (codregion,
#       default 8 = Biobío, official boundary via comunas) and to the source sensor (default Aqua) and SNPP,
#       summed by month (day and night together). Months with no row for a sensor in its operating period = 0.
# Period: 2012-02 to 2026-07. Fit on 2012-02 to 2019-12; test on 2020-01 to 2026-07 (not used to fit).
# Methods:
#   raw          no harmonization (SNPP = source)
#   ratio        k = sum(SNPP) / sum(source) over the fitting months
#   qmap         empirical quantile mapping, qmap::fitQmapQUANT + doQmapQUANT (linear), all months together
#   qmap_season  the same, fitted separately for the high season (calendar months that together hold >= 70 %
#                of the SNPP hotspots in the fitting years) and for the rest of the year
# Quantile mapping is done on log(1 + hotspots) and transformed back. Mapping is invariant to that transform
# inside the fitted range; beyond the largest fitted value qmap shifts by a constant, which on the log scale
# is a constant ratio (a constant shift on raw counts would badly underestimate record months such as Feb 2023).
# qstep = 0.05 (21 quantiles), wet.day = FALSE (zero months are kept as values).
#
# Metrics on the test months: mean absolute error of log(1 + hotspots), bias (mean log1p error, and total %),
# coverage of the 80 % interval. The interval is a bootstrap by years: each replicate resamples the fitting
# years with replacement, refits the method, predicts the test months and adds a log error drawn from the
# months of the fitting years left out of that replicate (out-of-bag). The 10th-90th percentiles of the
# 1,000 replicates give the 80 % interval. A bootstrap over the test years gives a 95 % CI for the MAE.
#
# Usage: Rscript pipeline/07_qmap_monthly_region.R results/model_input/monthly_comuna_counts_chile.csv.gz results/harmonization_qmap [codregion] [sensor]
#        defaults: codregion 8 (Biobío), sensor Aqua. Packages: qmap (and base R).

suppressPackageStartupMessages(library(qmap))

args <- commandArgs(trailingOnly = TRUE)
src_file <- if (length(args) >= 1) args[1] else "results/model_input/monthly_comuna_counts_chile.csv.gz"
out <- if (length(args) >= 2) args[2] else "results/harmonization_qmap"
REGION <- if (length(args) >= 3) as.integer(args[3]) else 8L
SENSOR <- if (length(args) >= 4) args[4] else "Aqua"
stopifnot(SENSOR %in% c("Aqua", "Terra"))
dir.create(out, showWarnings = FALSE, recursive = TRUE)

ZONE <- sprintf("region_%02d", REGION)
START <- "2012-02"; FIT_END <- "2019-12"; TEST_START <- "2020-01"; END <- "2026-07"
QSTEP <- 0.05; B <- 1000; HIGH_SHARE <- 0.70
PFX <- sprintf("%s_%s_snpp", ZONE, tolower(SENSOR))
set.seed(2026)

# ---------- data ----------
d <- read.csv(if (grepl("\\.gz$", src_file)) gzfile(src_file) else src_file)
d <- d[d$codregion == REGION & d$satellite %in% c(SENSOR, "SNPP"), ]
a <- aggregate(n_hotspots ~ month + satellite, data = d, FUN = sum)
months <- format(seq(as.Date(paste0(START, "-01")), as.Date(paste0(END, "-01")), by = "month"), "%Y-%m")
m <- data.frame(month = months, stringsAsFactors = FALSE)
for (s in c(SENSOR, "SNPP")) {
  x <- a[a$satellite == s, ]
  m[[if (s == "SNPP") "snpp" else "src"]] <- ifelse(is.na(match(months, x$month)), 0,
                                                     x$n_hotspots[match(months, x$month)])
}
m$year <- substr(m$month, 1, 4)
m$moy <- as.integer(substr(m$month, 6, 7))
fit_rows <- m$month <= FIT_END
test_rows <- m$month >= TEST_START
fitd <- m[fit_rows, ]; testd <- m[test_rows, ]

# high season: calendar months with the largest SNPP share in the fitting years, until >= 70 %
share <- sort(tapply(fitd$snpp, fitd$moy, sum) / sum(fitd$snpp), decreasing = TRUE)
HIGH <- sort(as.integer(names(share)[seq_len(which(cumsum(share) >= HIGH_SHARE)[1])]))
m$season_group <- ifelse(m$moy %in% HIGH, "high", "low")
fitd <- m[fit_rows, ]; testd <- m[test_rows, ]

# ---------- methods ----------
fit_qm <- function(src, snpp) fitQmapQUANT(log1p(snpp), log1p(src), qstep = QSTEP, wet.day = FALSE)
do_qm <- function(fobj, src) pmax(expm1(doQmapQUANT(log1p(src), fobj, type = "linear")), 0)

fit_method <- function(train, method) {
  switch(method,
    raw = NULL,
    ratio = sum(train$snpp) / sum(train$src),
    qmap = fit_qm(train$src, train$snpp),
    qmap_season = list(high = fit_qm(train$src[train$season_group == "high"], train$snpp[train$season_group == "high"]),
                       low = fit_qm(train$src[train$season_group == "low"], train$snpp[train$season_group == "low"])))
}
predict_method <- function(f, target, method) {
  switch(method,
    raw = as.numeric(target$src),
    ratio = target$src * f,
    qmap = do_qm(f, target$src),
    qmap_season = {
      p <- numeric(nrow(target))
      for (g in c("high", "low")) { i <- target$season_group == g; if (any(i)) p[i] <- do_qm(f[[g]], target$src[i]) }
      p
    })
}
METHODS <- c(raw = sprintf("No harmonization (SNPP = %s)", SENSOR),
             ratio = "Simple ratio",
             qmap = "Quantile mapping (qmap), all months",
             qmap_season = sprintf("Quantile mapping (qmap), high season (months %s) and rest fitted separately",
                                   paste(HIGH, collapse = ",")))

# ---------- point predictions on the test months ----------
pred <- data.frame(month = testd$month, season_group = testd$season_group, src = testd$src, snpp_observed = testd$snpp)
fits <- lapply(setNames(names(METHODS), names(METHODS)), function(me) fit_method(fitd, me))
for (me in names(METHODS)) pred[[me]] <- predict_method(fits[[me]], testd, me)

# ---------- 80 % interval: bootstrap by years with out-of-bag errors ----------
fit_years <- unique(fitd$year)
sims <- lapply(setNames(names(METHODS), names(METHODS)), function(me) matrix(NA_real_, B, nrow(testd)))
for (b in seq_len(B)) {
  yb <- sample(fit_years, length(fit_years), replace = TRUE)
  tr <- do.call(rbind, lapply(yb, function(y) fitd[fitd$year == y, ]))
  oob <- fitd[!fitd$year %in% yb, ]
  if (nrow(oob) == 0) oob <- tr
  for (me in names(METHODS)) {
    f <- fit_method(tr, me)
    e <- log1p(oob$snpp) - log1p(predict_method(f, oob, me))  # out-of-bag log errors
    p <- predict_method(f, testd, me)
    sims[[me]][b, ] <- pmax(expm1(log1p(p) + sample(e, length(p), replace = TRUE)), 0)
  }
}
for (me in names(METHODS)) {
  pred[[paste0(me, "_low")]] <- apply(sims[[me]], 2, quantile, .10, names = FALSE)
  pred[[paste0(me, "_high")]] <- apply(sims[[me]], 2, quantile, .90, names = FALSE)
}

# ---------- metrics ----------
test_years <- unique(substr(pred$month, 1, 4))
metrics <- do.call(rbind, lapply(names(METHODS), function(me) {
  o <- pred$snpp_observed; p <- pred[[me]]
  le <- log1p(p) - log1p(o)
  bt <- replicate(2000, {
    yy <- sample(test_years, length(test_years), replace = TRUE)
    i <- unlist(lapply(yy, function(y) which(substr(pred$month, 1, 4) == y)))
    mean(abs(le[i]))
  })
  data.frame(zone = ZONE, sensor = SENSOR, method = me, label = METHODS[[me]],
             fit_period = paste(START, FIT_END, sep = "_"), test_period = paste(TEST_START, END, sep = "_"),
             months = length(o),
             mae_log1p = mean(abs(le)),
             mae_log1p_ci95_low = quantile(bt, .025, names = FALSE),
             mae_log1p_ci95_high = quantile(bt, .975, names = FALSE),
             bias_log1p = mean(le),
             bias_total_pct = 100 * (sum(p) - sum(o)) / sum(o),
             coverage80_pct = 100 * mean(o >= pred[[paste0(me, "_low")]] & o <= pred[[paste0(me, "_high")]]),
             interval80_median_width_factor = median((pred[[paste0(me, "_high")]] + 1) / (pred[[paste0(me, "_low")]] + 1)),
             mae_hotspots = mean(abs(p - o)),
             mae_log1p_high_season = mean(abs(le[pred$season_group == "high"])),
             mae_log1p_low_season = mean(abs(le[pred$season_group == "low"])),
             stringsAsFactors = FALSE)
}))

# ---------- quantile tables (fit period used for the test, and the full overlap for the app) ----------
qtab <- function(f, group, period) {
  data.frame(zone = ZONE, season_group = group, sensor = SENSOR, fit_period = period,
             quantile = seq(0, 1, by = QSTEP),
             sensor_value = expm1(f$par$modq[, 1]), snpp_value = expm1(f$par$fitq[, 1]))
}
full_fits <- list(all = fit_qm(m$src, m$snpp),
                  high = fit_qm(m$src[m$season_group == "high"], m$snpp[m$season_group == "high"]),
                  low = fit_qm(m$src[m$season_group == "low"], m$snpp[m$season_group == "low"]))
fp <- paste(START, FIT_END, sep = "_"); full <- paste(START, END, sep = "_")
quantiles <- rbind(qtab(fits$qmap, "all_year", fp), qtab(fits$qmap_season$high, "high", fp),
                   qtab(fits$qmap_season$low, "low", fp),
                   qtab(full_fits$all, "all_year", full), qtab(full_fits$high, "high", full),
                   qtab(full_fits$low, "low", full))

# ---------- save ----------
r <- function(df, k) { for (j in names(df)) if (is.double(df[[j]])) df[[j]] <- round(df[[j]], k); df }
write.csv(r(metrics, 4), file.path(out, "metrics.csv"), row.names = FALSE)
write.csv(r(quantiles, 3), file.path(out, "quantiles.csv"), row.names = FALSE)
write.csv(r(pred, 2), file.path(out, "test_predictions.csv"), row.names = FALSE)
writeLines(c(sprintf("zone: %s (codregion %d), sensor: %s", ZONE, REGION, SENSOR),
             sprintf("high season months (>= 70 %% of SNPP hotspots, %s): %s", fp, paste(HIGH, collapse = ", ")),
             sprintf("simple ratio k (%s): %.4f", fp, fits$ratio),
             sprintf("qstep %.2f, bootstrap replicates %d, seed 2026", QSTEP, B)),
           file.path(out, "run_info.txt"))

# ---------- figure (English) ----------
cols <- c(obs = "#d9480f", raw = "#1c7ed6", ratio = "#7048e8", qmap = "#2f9e44", qmap_season = "#e8590c")
slog <- function(v) log10(1 + v)
png(file.path(out, "test_months_observed_vs_predicted.png"), width = 2100, height = 1300, res = 150)
layout(matrix(c(1, 1, 2, 3), 2, byrow = TRUE), heights = c(1.3, 1))
par(mar = c(3, 5.8, 3.2, 1), cex = .8, mgp = c(4, .8, 0))
tt <- as.Date(paste0(pred$month, "-01"))
yl <- c(0, max(slog(c(pred$snpp_observed, pred$qmap_high, pred$ratio))) * 1.08)
plot(tt, slog(pred$snpp_observed), type = "n", ylim = yl, yaxt = "n", xlab = "", ylab = "Hotspots per month (log scale)",
     main = sprintf("%s, test months %s to %s: Suomi NPP observed vs reconstructed from MODIS %s (fitted on %s to %s)",
                    if (REGION == 8) "Biob\u00edo (region 8)" else paste("Region", REGION),
                    TEST_START, END, SENSOR, START, FIT_END))
ticks <- c(0, 1, 10, 100, 1000, 10000, 1e5)
axis(2, at = slog(ticks), labels = c("0", "1", "10", "100", "1,000", "10,000", "100,000"), las = 1)
abline(h = slog(ticks), col = "grey90")
hs <- pred$season_group == "high"
rect(tt[hs] - 14, -1, tt[hs] + 14, 99, col = "grey96", border = NA)
polygon(c(tt, rev(tt)), slog(c(pred$qmap_low, rev(pred$qmap_high))), col = adjustcolor(cols["qmap"], .18), border = NA)
lines(tt, slog(pred$raw), col = cols["raw"])
lines(tt, slog(pred$ratio), col = cols["ratio"], lty = 2)
lines(tt, slog(pred$qmap), col = cols["qmap"], lwd = 1.6)
lines(tt, slog(pred$snpp_observed), col = cols["obs"], lwd = 2.2)
box()
legend("topright", bty = "n", ncol = 3, cex = .9,
       legend = c("Suomi NPP observed (hidden when fitting)", sprintf("No harmonization (MODIS %s)", SENSOR),
                  "Simple ratio", "Quantile mapping (qmap)", "Quantile mapping, 80 % interval", "High season months"),
       col = c(cols["obs"], cols["raw"], cols["ratio"], cols["qmap"], adjustcolor(cols["qmap"], .3), "grey90"),
       lwd = c(2.2, 1, 1, 1.6, 8, 8), lty = c(1, 1, 2, 1, 1, 1))

par(mar = c(4.5, 4.8, 3, 1), mgp = c(3, 1, 0))
lim <- c(1, max(pred$snpp_observed, pred$ratio, pred$qmap, pred$raw) * 1.6)
plot(pred$snpp_observed + 1, pred$raw + 1, log = "xy", xlim = lim, ylim = lim, pch = 16, col = adjustcolor(cols["raw"], .55),
     xlab = "Observed Suomi NPP + 1", ylab = "Predicted + 1", main = "Each test month")
points(pred$snpp_observed + 1, pred$ratio + 1, pch = 16, col = adjustcolor(cols["ratio"], .6))
points(pred$snpp_observed + 1, pred$qmap + 1, pch = 16, col = adjustcolor(cols["qmap"], .7))
abline(0, 1, lty = 2, col = "grey40")
legend("topleft", bty = "n", pch = 16, col = cols[c("raw", "ratio", "qmap")],
       legend = c("No harmonization", "Simple ratio", "Quantile mapping"))

par(mar = c(1, 1, 3, 1)); plot.new(); title("Test months: error and interval", line = 1)
sh <- metrics[match(c("raw", "ratio", "qmap", "qmap_season"), metrics$method), ]
lab <- c("No harmonization", "Simple ratio", "Quantile mapping", "QM by season")
txt <- c(sprintf("%-18s%10s%10s%10s%10s", "", "MAE log1p", "bias %", "cover 80%", "MAE"),
         sprintf("%-18s%10.2f%+10.0f%10.0f%10.0f", lab, sh$mae_log1p, sh$bias_total_pct, sh$coverage80_pct, sh$mae_hotspots),
         "", sprintf("%d test months. MAE log1p = mean |log(1+pred) - log(1+obs)|.", nrow(pred)),
         sprintf("High season = months %s (>= 70 %% of Suomi NPP hotspots, %s).", paste(HIGH, collapse = ", "), fp),
         "80 % interval: bootstrap by fitting years with out-of-bag errors.",
         "Data: NASA FIRMS standard, type 0, low confidence removed.")
text(0, .92, paste(txt, collapse = "\n"), adj = c(0, 1), family = "mono", cex = .95)
invisible(dev.off())

print(r(metrics[, c("method", "mae_log1p", "mae_log1p_ci95_low", "mae_log1p_ci95_high", "bias_log1p",
                    "bias_total_pct", "coverage80_pct", "interval80_median_width_factor", "mae_hotspots",
                    "mae_log1p_high_season", "mae_log1p_low_season")], 3))
cat(readLines(file.path(out, "run_info.txt")), sep = "\n")
