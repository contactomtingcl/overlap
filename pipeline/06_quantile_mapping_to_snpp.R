# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
# Harmonization v1 (R version of 06_quantile_mapping_to_snpp.py; same method, same output files).
#
# Quantile mapping MODIS (Aqua or Terra) -> VIIRS Suomi NPP in Biobío, with a hidden-years test.
# Question: if we only had the MODIS sensor, how well could we reconstruct the Suomi NPP monthly count?
#
# Design (fixed before looking at the test years):
# - unit: daily regional totals of each sensor, mapped day by day, then summed to months
# - fit on 2012-01-20 to 2019-12-31, test on 2020-01-01 to 2026-07-30 (never seen when fitting)
# - baselines: (0) no harmonization (raw MODIS) and (1) simple ratio k = sum(SNPP) / sum(MODIS)
# - candidates: QM on daily totals; QM day and night separately; QM on monthly totals;
#   QM by season (Nov-Apr / May-Oct), with and without the day/night split
# - model selection uses the training years only (lowest leave-one-year-out MAE inside 2012-2019);
#   the hidden years are scored once for every candidate.
#
# Quantile mapping with ties: each distinct MODIS value v occupies the probability band (F(v-), F(v)]
# and is mapped to the mean of the Suomi NPP quantile function over that band. Above the 99th
# percentile of the training values the map continues as a straight line with the ratio of the top 1 %.
# Uncertainty: 10th-90th percentiles of leave-one-year-out log errors give an 80 % band.
# Terra: its orbit drifts earlier since Feb 2020, so the hidden years are also scored for 2020-2022
# (near-nominal orbit) and 2023-2026 (drifted).
#
# Usage:
#   Rscript pipeline/06_quantile_mapping_to_snpp.R results/model_input/daily_cell_counts_chile.csv.gz results/harmonization Aqua
#   Rscript pipeline/06_quantile_mapping_to_snpp.R results/model_input/daily_cell_counts_chile.csv.gz results/harmonization Terra
# Packages: data.table (graphics are base R). The bootstrap uses R's random generator, so its
# confidence intervals differ slightly from the Python version; every other number is identical.

suppressPackageStartupMessages(library(data.table))

args <- commandArgs(trailingOnly = TRUE)
src_file <- args[1]
out <- args[2]
SRC <- if (length(args) >= 3) args[3] else "Aqua"
stopifnot(SRC %in% c("Aqua", "Terra"))
PFX <- paste0(tolower(SRC), "_snpp")
FIG <- c(Aqua = "fig02", Terra = "fig03")[[SRC]]
dir.create(out, showWarnings = FALSE, recursive = TRUE)

BIOBIO <- list(lat_min = -38.50, lat_max = -36.45, lon_min = -73.95, lon_max = -70.95)  # same box as 02
START <- "2012-01-20"; TRAIN_END <- "2019-12-31"; TEST_START <- "2020-01-01"; END <- "2026-07-30"
set.seed(2026)

# ---------- data: daily regional totals, zeros filled ----------
c_ <- as.data.table(read.csv(if (grepl("\\.gz$", src_file)) gzfile(src_file) else src_file))
c_ <- c_[cell_lat >= BIOBIO$lat_min & cell_lat <= BIOBIO$lat_max &
         cell_lon >= BIOBIO$lon_min & cell_lon <= BIOBIO$lon_max & satellite %in% c(SRC, "SNPP")]
c_[satellite == SRC, satellite := "X"]
c_[, date := as.character(date)]
c_[, key := paste(satellite, daynight, sep = "_")]
days <- format(seq(as.Date(START), as.Date(END), by = "day"), "%Y-%m-%d")
w <- dcast(c_[date %in% days], date ~ key, value.var = "n_hotspots", fun.aggregate = sum, fill = 0)
daily <- merge(data.table(date = days), w, by = "date", all.x = TRUE)
for (col in c("X_D", "X_N", "SNPP_D", "SNPP_N")) {
  if (!col %in% names(daily)) daily[, (col) := 0]
  set(daily, which(is.na(daily[[col]])), col, 0)
}
daily[, X := X_D + X_N]
daily[, SNPP := SNPP_D + SNPP_N]
daily[, month := substr(date, 1, 7)]
daily[, year := as.integer(substr(date, 1, 4))]
daily[, fire_season := as.integer(substr(date, 6, 7)) %in% c(11, 12, 1, 2, 3, 4)]  # Nov-Apr
setorder(daily, date)
train_days <- daily[date <= TRAIN_END]
test_days <- daily[date >= TEST_START]

# ---------- tie-aware empirical quantile mapping ----------
fit_qm <- function(x, y, tail = 0.01) {
  x <- sort(as.numeric(x)); y <- sort(as.numeric(y))
  n_x <- length(x); n_y <- length(y)
  r <- rle(x); vals <- r$values; counts <- r$lengths
  cum_hi <- cumsum(counts) / n_x
  cum_lo <- cum_hi - counts / n_x
  cy <- c(0, cumsum(y)) / n_y
  q_int <- function(p) {  # integral of the empirical quantile function of y from 0 to p
    k <- p * n_y
    i <- pmin(pmax(floor(k), 0), n_y - 1)
    cy[i + 1] + (k - i) * y[i + 1] / n_y
  }
  mapped <- (q_int(cum_hi) - q_int(cum_lo)) / (cum_hi - cum_lo)
  x_t <- quantile(x, 1 - tail, names = FALSE)
  top_x <- x >= x_t
  top_y <- y >= quantile(y, 1 - tail, names = FALSE)
  ratio <- mean(y[top_y]) / max(mean(x[top_x]), 1e-9)
  keep <- vals <= x_t
  list(xs = vals[keep], ys = mapped[keep], ratio = ratio)
}

apply_qm <- function(model, x) {
  x <- as.numeric(x)
  xs <- model$xs; ys <- model$ys
  out_ <- if (length(xs) > 1) approx(xs, ys, x, rule = 2)$y else rep(ys[1], length(x))
  above <- x > xs[length(xs)]
  out_[above] <- ys[length(ys)] + (x[above] - xs[length(xs)]) * model$ratio
  out_
}

predict_daily <- function(train, target, method) {
  switch(method,
    raw = as.numeric(target$X),
    ratio = target$X * sum(train$SNPP) / sum(train$X),
    qm_daily = apply_qm(fit_qm(train$X, train$SNPP), target$X),
    qm_daynight = apply_qm(fit_qm(train$X_D, train$SNPP_D), target$X_D) +
                  apply_qm(fit_qm(train$X_N, train$SNPP_N), target$X_N),
    {
      stopifnot(method %in% c("qm_season", "qm_season_daynight"))
      cols <- if (method == "qm_season") list(c("X", "SNPP")) else list(c("X_D", "SNPP_D"), c("X_N", "SNPP_N"))
      out_ <- numeric(nrow(target))
      for (season in c(TRUE, FALSE)) {
        f <- train[fire_season == season]
        t <- target$fire_season == season
        if (any(t)) for (cv in cols)
          out_[t] <- out_[t] + apply_qm(fit_qm(f[[cv[1]]], f[[cv[2]]]), target[[cv[1]]][t])
      }
      out_
    })
}

monthly_pred <- function(train, target, method) {
  if (method == "qm_monthly") {
    tm <- train[, .(X = sum(X), SNPP = sum(SNPP)), by = month]
    gm <- target[, .(X = sum(X)), by = month]
    return(setNames(apply_qm(fit_qm(tm$X, tm$SNPP, tail = 0.05), gm$X), gm$month))
  }
  p <- predict_daily(train, target, method)
  s <- tapply(p, target$month, sum)
  s[order(names(s))]
}

METHODS <- c(raw = sprintf("No harmonization (raw %s)", SRC), ratio = "Simple ratio",
             qm_daily = "Quantile mapping, daily",
             qm_daynight = "Quantile mapping, daily, day and night separately",
             qm_monthly = "Quantile mapping, monthly totals",
             qm_season = "Quantile mapping, daily, by season (Nov-Apr / May-Oct)",
             qm_season_daynight = "Quantile mapping, daily, by season and day/night")

# ---------- out-of-sample errors inside the training years (leave one year out) ----------
loyo <- rbindlist(lapply(sort(unique(train_days$year)), function(yr) {
  fit <- train_days[year != yr]; hold <- train_days[year == yr]
  obs <- hold[, .(obs = sum(SNPP)), by = month][order(month)]
  rbindlist(lapply(names(METHODS), function(m)
    data.table(method = m, month = obs$month, obs = obs$obs, pred = as.numeric(monthly_pred(fit, hold, m)))))
}))
loyo[, logerr := log((obs + 1) / (pred + 1))]
loyo_summary <- loyo[, .(MAE = mean(abs(pred - obs)), mean_abs_log_error = mean(abs(logerr)),
                         total_bias_pct = 100 * (sum(pred) / sum(obs) - 1)), by = method][order(method)]
cand <- loyo_summary[!method %in% c("raw", "ratio")]
SEL <- cand$method[which.min(cand$MAE)]  # chosen on training years only
band <- loyo[, .(q10 = quantile(logerr, .1, names = FALSE), q90 = quantile(logerr, .9, names = FALSE)),
             by = method][order(method)]
setkey(band, method)

# ---------- hidden-years test ----------
obs_test <- test_days[, .(source = sum(X), snpp_observed = sum(SNPP)), by = month][order(month)]
pred <- copy(obs_test)
for (m in names(METHODS)) {
  p <- as.numeric(monthly_pred(train_days, test_days, m))
  set(pred, j = m, value = p)
  set(pred, j = paste0(m, "_low"), value = pmax((p + 1) * exp(band[m, q10]) - 1, 0))
  set(pred, j = paste0(m, "_high"), value = (p + 1) * exp(band[m, q90]) - 1)
}

metrics <- function(o, p, lo, hi) {
  le <- log((p + 1) / (o + 1))
  list(MAE = mean(abs(p - o)), RMSE = sqrt(mean((p - o)^2)),
       total_bias_pct = 100 * (sum(p) - sum(o)) / sum(o),
       mean_abs_log_error = mean(abs(le)),
       typical_factor_error = exp(median(abs(le))),
       `months_within_factor_1.5_pct` = 100 * mean(abs(le) <= log(1.5)),
       spearman = cor(o, p, method = "spearman"),
       band80_coverage_pct = 100 * mean(o >= lo & o <= hi))
}

pred[, yr := substr(month, 1, 4)]
res <- rbindlist(lapply(names(METHODS), function(m) {
  o <- pred$snpp_observed; p <- pred[[m]]
  r <- c(list(method = m, label = METHODS[[m]], selected = m == SEL, months = nrow(pred)),
         metrics(o, p, pred[[paste0(m, "_low")]], pred[[paste0(m, "_high")]]))
  ann <- pred[, .(o = sum(snpp_observed), p = sum(get(m))), by = yr]
  quiet <- o < 100
  c(r, list(annual_mean_abs_pct_error = 100 * mean(abs(ann$p - ann$o) / ann$o),
            `MAE_quiet_months(<100)` = mean(abs(p - o)[quiet]),
            `MAE_busy_months(>=100)` = mean(abs(p - o)[!quiet])))
}))

periods <- list("2020-2026" = c("2020", "2026"), "2020-2022 (Terra near-nominal orbit)" = c("2020", "2022"),
                "2023-2026 (Terra drifted orbit)" = c("2023", "2026"))
res_period <- rbindlist(lapply(names(periods), function(per) {
  sub <- pred[yr >= periods[[per]][1] & yr <= periods[[per]][2]]
  rbindlist(lapply(names(METHODS), function(m)
    c(list(period = per, method = m, selected = m == SEL, months = nrow(sub)),
      metrics(sub$snpp_observed, sub[[m]], sub[[paste0(m, "_low")]], sub[[paste0(m, "_high")]]))))
}))

# block bootstrap by year: is the selected model better than the simple ratio?
yrs <- unique(pred$yr)
mae <- function(s, m) mean(abs(s[[m]] - s$snpp_observed))
mal <- function(s, m) mean(abs(log((s[[m]] + 1) / (s$snpp_observed + 1))))
bs <- t(replicate(2000, {
  s <- rbindlist(lapply(sample(yrs, length(yrs), replace = TRUE), function(y) pred[yr == y]))
  c(mae(s, SEL) - mae(s, "ratio"), mal(s, SEL) - mal(s, "ratio"))
}))
boot <- data.table(comparison = paste(SEL, c("minus ratio: MAE", "minus ratio: mean abs log error")),
                   estimate = c(mae(pred, SEL) - mae(pred, "ratio"), mal(pred, SEL) - mal(pred, "ratio")),
                   ci95_low = apply(bs, 2, quantile, .025, names = FALSE),
                   ci95_high = apply(bs, 2, quantile, .975, names = FALSE),
                   share_of_resamples_qm_better = colMeans(bs < 0))

# ---------- final maps for the app: refitted on the whole overlap (2012-2026) ----------
# One table per overpass (D, N, all = daily total) and season (all year, Nov-Apr, May-Oct);
# above the last value in a table: last snpp_equivalent + (x - last value) * tail_ratio.
seasons <- list(all_year = rep(TRUE, nrow(daily)), nov_apr = daily$fire_season, may_oct = !daily$fire_season)
parts <- list(D = c("X_D", "SNPP_D"), N = c("X_N", "SNPP_N"), all = c("X", "SNPP"))
final <- rbindlist(lapply(names(seasons), function(se) {
  dd <- daily[seasons[[se]]]
  rbindlist(lapply(names(parts), function(pa) {
    f <- fit_qm(dd[[parts[[pa]][1]]], dd[[parts[[pa]][2]]])
    data.table(source = SRC, season = se, overpass = pa, source_daily_hotspots = f$xs,
               snpp_equivalent = f$ys, tail_ratio = f$ratio)
  }))
}))
final[, `:=`(fitted_on = paste(START, "to", END), selected_model = SEL)]

# ---------- save ----------
rnd <- function(dt, d) { dt <- copy(dt); for (j in names(dt)) if (is.double(dt[[j]])) set(dt, j = j, value = round(dt[[j]], d)); dt }
fwrite(rnd(res, 3), file.path(out, paste0(PFX, "_test_metrics.csv")))
fwrite(rnd(res_period, 3), file.path(out, paste0(PFX, "_test_metrics_by_period.csv")))
fwrite(rnd(boot, 3), file.path(out, paste0(PFX, "_bootstrap_qm_vs_ratio.csv")))
fwrite(rnd(pred[, !"yr"], 1), file.path(out, paste0(PFX, "_test_monthly_predictions.csv")))
fwrite(rnd(band, 4), file.path(out, paste0(PFX, "_band_loyo.csv")))
fwrite(rnd(loyo_summary, 3), file.path(out, paste0(PFX, "_loyo_2012_2019_metrics.csv")))
fwrite(rnd(final, 3), file.path(out, paste0(PFX, "_qm_tables_final.csv")))

# ---------- figure (base R) ----------
k <- sum(train_days$SNPP) / sum(train_days$X)
slog <- function(v) sign(v) * log10(1 + abs(v) / 10)  # symlog-like axis, linear below 10
png(file.path(out, sprintf("%s_biobio_qm_%s_hidden_years.png", FIG, tolower(SRC))),
    width = 2100, height = 1230, res = 150)
layout(matrix(c(1, 1, 1, 2, 3, 4), 2, byrow = TRUE), heights = c(1.25, 1))
par(mar = c(3, 4.5, 3, 1), cex = 0.8)
tt <- as.Date(paste0(pred$month, "-01"))
yl <- range(slog(c(0, pred$snpp_observed, pred[[paste0(SEL, "_high")]], pred$ratio)))
plot(tt, slog(pred$snpp_observed), type = "n", ylim = yl, yaxt = "n", xlab = "", ylab = "Hotspots per month (symlog)",
     main = sprintf("Biob\u00edo, hidden years 2020-2026: reconstructing Suomi NPP from MODIS %s (fitted on 2012-2019 only)", SRC))
ticks <- c(0, 10, 100, 1000, 10000, 1e5)
axis(2, at = slog(ticks), labels = c("0", "10", "100", "1000", "1e4", "1e5"), las = 1)
abline(h = slog(ticks), col = "grey90")
polygon(c(tt, rev(tt)), slog(c(pred[[paste0(SEL, "_low")]], rev(pred[[paste0(SEL, "_high")]]))),
        col = adjustcolor("#2f9e44", .18), border = NA)
lines(tt, slog(pred$raw), col = "#1c7ed6")
lines(tt, slog(pred$ratio), col = "#7048e8", lty = 2)
lines(tt, slog(pred[[SEL]]), col = "#2f9e44", lwd = 1.5)
lines(tt, slog(pred$snpp_observed), col = "#d9480f", lwd = 2)
legend("topright", bty = "n", ncol = 3, cex = .9,
       legend = c("Quantile mapping, 80 % band", "Suomi NPP observed (hidden)", sprintf("Quantile mapping from %s", SRC),
                  sprintf("Simple ratio from %s", SRC), sprintf("Raw %s (no harmonization)", SRC)),
       col = c(adjustcolor("#2f9e44", .3), "#d9480f", "#2f9e44", "#7048e8", "#1c7ed6"),
       lwd = c(8, 2, 1.5, 1, 1), lty = c(1, 1, 1, 2, 1))

par(mar = c(4.5, 4.5, 3, 1))
lim <- c(1, max(pred$snpp_observed, pred$ratio, pred[[SEL]]) * 1.5)
plot(pred$snpp_observed + 1, pred$ratio + 1, log = "xy", xlim = lim, ylim = lim, pch = 16,
     col = adjustcolor("#7048e8", .6), xlab = "Observed Suomi NPP + 1", ylab = "Predicted + 1",
     main = "Month by month, hidden years")
points(pred$snpp_observed + 1, pred[[SEL]] + 1, pch = 16, col = adjustcolor("#2f9e44", .6))
abline(0, 1, lty = 2, col = "grey50")
legend("topleft", bty = "n", pch = 16, col = c("#7048e8", "#2f9e44"), legend = c("Simple ratio", "Quantile mapping"))

xs <- 0:120
plot(xs, apply_qm(fit_qm(train_days$X_D, train_days$SNPP_D), xs), type = "l", col = "#2f9e44", lwd = 2,
     ylim = c(0, max(apply_qm(fit_qm(train_days$X_D, train_days$SNPP_D), xs),
                     apply_qm(fit_qm(train_days$X_N, train_days$SNPP_N), xs), xs * k)),
     xlab = sprintf("%s hotspots in one day", SRC), ylab = "Suomi NPP-equivalent",
     main = "Day/night maps learned on 2012-2019 (all seasons)")
lines(xs, apply_qm(fit_qm(train_days$X_N, train_days$SNPP_N), xs), col = "#2f9e44", lwd = 2, lty = 3)
lines(xs, xs * k, col = "#7048e8", lty = 2)
legend("topleft", bty = "n", legend = c("Quantile map, day overpass", "Quantile map, night overpass",
                                        sprintf("Ratio k = %.2f", k)),
       col = c("#2f9e44", "#2f9e44", "#7048e8"), lty = c(1, 3, 2), lwd = c(2, 2, 1))

par(mar = c(1, 1, 3, 1)); plot.new()
show <- res[match(c("raw", "ratio", SEL), method)]
fmt <- function(v, f) sprintf(f, v)
txt <- c(sprintf("Hidden years 2020-2026 (%d months)", show$months[1]), "",
         sprintf("%-18s%9s%9s%9s", "", "raw", "ratio", "QM"),
         sprintf("%-18s%9s%9s%9s", "MAE (hotspots)", fmt(show$MAE[1], "%.0f"), fmt(show$MAE[2], "%.0f"), fmt(show$MAE[3], "%.0f")),
         sprintf("%-18s%9s%9s%9s", "Total bias %", fmt(show$total_bias_pct[1], "%+.0f"), fmt(show$total_bias_pct[2], "%+.0f"), fmt(show$total_bias_pct[3], "%+.0f")),
         sprintf("%-18s%9s%9s%9s", "Typical factor", fmt(show$typical_factor_error[1], "x%.2f"), fmt(show$typical_factor_error[2], "x%.2f"), fmt(show$typical_factor_error[3], "x%.2f")),
         sprintf("%-18s%9s%9s%9s", "Within x1.5 (%)", fmt(show$`months_within_factor_1.5_pct`[1], "%.0f"), fmt(show$`months_within_factor_1.5_pct`[2], "%.0f"), fmt(show$`months_within_factor_1.5_pct`[3], "%.0f")),
         sprintf("%-18s%9s%9s%9s", "80% band cover.", fmt(show$band80_coverage_pct[1], "%.0f"), fmt(show$band80_coverage_pct[2], "%.0f"), fmt(show$band80_coverage_pct[3], "%.0f")))
text(0, 1, paste(txt, collapse = "\n"), adj = c(0, 1), family = "mono", cex = 1)
mtext("Standard FIRMS data, type 0, low confidence removed.\nBiob\u00edo = approximate box (0.1-degree cells). Data: NASA FIRMS.",
      side = 1, line = -0.5, adj = 0, cex = .6, col = "grey40", outer = FALSE)
invisible(dev.off())

# ---------- console summary ----------
print(res[, .(method, selected, MAE = round(MAE, 1), bias = round(total_bias_pct, 1),
              factor = round(typical_factor_error, 3), cover80 = round(band80_coverage_pct, 1))])
print(rnd(boot, 3))
print(rnd(res_period[method %in% c("raw", "ratio", SEL), .(period, method, MAE, total_bias_pct, band80_coverage_pct)], 1))
cat("Leave-one-year-out inside 2012-2019:\n"); print(rnd(loyo_summary, 3))
cat(sprintf("%s: selected on training years: %s; ratio k (train) = %.3f\n", SRC, SEL, k))
