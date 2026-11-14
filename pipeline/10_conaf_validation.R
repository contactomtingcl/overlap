# Written with AI assistance (Claude, Anthropic); reviewed and run by the Overlap team. See docs/AI_USE.md.
# Validation of the harmonized calendar against CONAF fire records, seasons 2002-03 to 2019-20,
# regions Biobío (8), Ñuble (16), Maule (7) and Araucanía (9).
#
# A. Does harmonization remove the false 2012 jump? Region-month regression
#      log(1 + hotspots) ~ log(1 + CONAF burned area) + log(1 + CONAF number of fires) + region + calendar month + era
#    where era = Suomi NPP period (2012-02 onwards) vs MODIS Aqua period. exp(era coefficient) is the jump in
#    hotspots per unit of real fire activity at the sensor change. Unharmonized series (Aqua counts, then Suomi NPP
#    counts) vs harmonized series (Suomi NPP-equivalent, from 09). A harmonized series should give a jump near 1.
#    95 % CI by bootstrap over fire seasons (2,000 replicates).
# B. Spearman rank correlation of monthly hotspots with CONAF fires and burned area, by era, at region-month and
#    comuna-month scale. Within one era the mapping is monotone, so ranks are the same for raw and harmonized
#    counts; across the whole period 2002-2020 they are not, and that is where harmonization should help.
# C. Coarse hit rate: share of CONAF fires with at least one hotspot in the same comuna in the month the fire
#    started, by burned-area class (>= 200 ha is CONAF's "incendio de magnitud"). For 2012-2020 both sensors are
#    scored on the same fires. The point-based rate (3 km, -1 to +2 days) is in results/validation (Biobío).
#
# Usage: Rscript pipeline/10_conaf_validation.R data/conaf/conaf_incendios_chile_2002_2020.csv.gz \
#          results/normal/harmonized_monthly_with_anomaly.csv results/model_input/monthly_comuna_counts_chile.csv.gz \
#          results/model_input/comunas_lookup.csv results/validation_conaf
# Packages: base R only.

args <- commandArgs(trailingOnly = TRUE)
rd <- function(f) read.csv(if (grepl("\\.gz$", f)) gzfile(f) else f, encoding = "UTF-8", stringsAsFactors = FALSE)
conaf <- rd(args[1]); harm <- rd(args[2]); comuna_counts <- rd(args[3]); lookup <- rd(args[4]); out <- args[5]
dir.create(out, showWarnings = FALSE, recursive = TRUE)
set.seed(2026)
REG <- c(`7` = "Maule", `8` = "Biob\u00edo", `9` = "Araucan\u00eda", `16` = "\u00d1uble")
START <- "2002-07"; END <- "2020-06"; SNPP_START <- "2012-02"
months <- format(seq(as.Date(paste0(START, "-01")), as.Date(paste0(END, "-01")), by = "month"), "%Y-%m")
season_of <- function(m) { y <- as.integer(substr(m, 1, 4)); s <- ifelse(as.integer(substr(m, 6, 7)) >= 7, y, y - 1); sprintf("%d-%d", s, s + 1) }

# ---------- CONAF: match comunas to codes (accent- and case-insensitive) ----------
norm <- function(s) tolower(trimws(iconv(s, "UTF-8", "ASCII//TRANSLIT")))
lookup$k <- norm(lookup$Comuna)
conaf$k <- norm(conaf$comuna)
conaf$cod_comuna <- lookup$cod_comuna[match(conaf$k, lookup$k)]
conaf$codregion <- lookup$codregion[match(conaf$k, lookup$k)]
conaf <- conaf[!is.na(conaf$codregion) & conaf$codregion %in% as.integer(names(REG)), ]
conaf$month <- substr(conaf$fecha, 1, 7)
conaf <- conaf[conaf$month >= START & conaf$month <= END, ]
cat("CONAF fires used:", nrow(conaf), "\n")

# ---------- region-month table ----------
rm_tab <- expand.grid(month = months, codregion = as.integer(names(REG)), stringsAsFactors = FALSE)
k1 <- paste(rm_tab$codregion, rm_tab$month)
cf <- aggregate(cbind(n = 1, ha = sup_total_ha) ~ codregion + month, data = conaf, FUN = sum)
rm_tab$conaf_fires <- cf$n[match(k1, paste(cf$codregion, cf$month))]
rm_tab$conaf_ha <- cf$ha[match(k1, paste(cf$codregion, cf$month))]
rm_tab[is.na(rm_tab)] <- 0
hk <- match(k1, paste(harm$codregion, harm$month))
rm_tab$hot_raw <- harm$source_hotspots[hk]          # Aqua counts before 2012-02, Suomi NPP counts after
rm_tab$hot_harmonized <- harm$snpp_equivalent[hk]   # Suomi NPP-equivalent throughout
rm_tab$era_snpp <- as.integer(rm_tab$month >= SNPP_START)
rm_tab$season <- season_of(rm_tab$month)
rm_tab$cal_month <- factor(substr(rm_tab$month, 6, 7))
rm_tab$region <- factor(rm_tab$codregion)

# ---------- A. jump at the sensor change ----------
jump <- function(dat, y) {
  f <- if (length(unique(dat$region)) > 1)
    log1p(dat[[y]]) ~ log1p(conaf_ha) + log1p(conaf_fires) + region + cal_month + era_snpp else
    log1p(dat[[y]]) ~ log1p(conaf_ha) + log1p(conaf_fires) + cal_month + era_snpp
  unname(exp(coef(lm(f, data = dat))["era_snpp"]))
}
seasons <- unique(rm_tab$season)
jump_rows <- list()
for (scope in c("all", names(REG))) {
  dat <- if (scope == "all") rm_tab else rm_tab[rm_tab$codregion == as.integer(scope), ]
  for (y in c("hot_raw", "hot_harmonized")) {
    est <- jump(dat, y)
    bs <- replicate(2000, { s <- sample(seasons, length(seasons), replace = TRUE)
      jump(do.call(rbind, lapply(s, function(z) dat[dat$season == z, ])), y) })
    jump_rows[[length(jump_rows) + 1]] <- data.frame(
      zone = if (scope == "all") "all four regions" else sprintf("region_%02d", as.integer(scope)),
      series = if (y == "hot_raw") "unharmonized (Aqua, then Suomi NPP)" else "harmonized (Suomi NPP-equivalent)",
      jump_factor_at_2012 = est, ci95_low = quantile(bs, .025, names = FALSE), ci95_high = quantile(bs, .975, names = FALSE),
      region_months = nrow(dat))
  }
}
jumps <- do.call(rbind, jump_rows)

# ---------- B. Spearman correlations ----------
sp <- function(a, b) suppressWarnings(cor(a, b, method = "spearman"))
eras <- list("Aqua era 2002-07 to 2012-01" = c(START, "2012-01"), "Suomi NPP era 2012-02 to 2020-06" = c(SNPP_START, END),
             "whole period 2002-07 to 2020-06" = c(START, END))
cor_rows <- list()
for (scope in c("all", names(REG))) {
  dat <- if (scope == "all") rm_tab else rm_tab[rm_tab$codregion == as.integer(scope), ]
  for (e in names(eras)) {
    x <- dat[dat$month >= eras[[e]][1] & dat$month <= eras[[e]][2], ]
    for (y in c("hot_raw", "hot_harmonized")) {
      if (e != "whole period 2002-07 to 2020-06" && y == "hot_raw") next  # same ranks within one era
      cor_rows[[length(cor_rows) + 1]] <- data.frame(
        scale = "region-month", zone = if (scope == "all") "all four regions" else sprintf("region_%02d", as.integer(scope)),
        period = e, series = if (e != "whole period 2002-07 to 2020-06") "either (same ranks within an era)" else
          if (y == "hot_raw") "unharmonized" else "harmonized",
        n = nrow(x), spearman_vs_conaf_fires = sp(x[[y]], x$conaf_fires), spearman_vs_conaf_area = sp(x[[y]], x$conaf_ha))
    }
  }
}
# comuna-month, raw counts of the sensor of each era
cc <- comuna_counts[comuna_counts$codregion %in% as.integer(names(REG)) & comuna_counts$satellite %in% c("Aqua", "SNPP"), ]
cc <- aggregate(n_hotspots ~ cod_comuna + codregion + month + satellite, data = cc, FUN = sum)
comunas <- unique(lookup[lookup$codregion %in% as.integer(names(REG)), c("cod_comuna", "codregion")])
cm_tab <- merge(comunas, data.frame(month = months), by = NULL)
kc <- paste(cm_tab$cod_comuna, cm_tab$month)
cfc <- aggregate(cbind(n = 1, ha = sup_total_ha) ~ cod_comuna + month, data = conaf, FUN = sum)
cm_tab$conaf_fires <- cfc$n[match(kc, paste(cfc$cod_comuna, cfc$month))]
cm_tab$conaf_ha <- cfc$ha[match(kc, paste(cfc$cod_comuna, cfc$month))]
for (s in c("Aqua", "SNPP")) {
  x <- cc[cc$satellite == s, ]
  cm_tab[[s]] <- x$n_hotspots[match(kc, paste(x$cod_comuna, x$month))]
}
cm_tab[is.na(cm_tab)] <- 0
for (scope in c("all", names(REG))) {
  dat <- if (scope == "all") cm_tab else cm_tab[cm_tab$codregion == as.integer(scope), ]
  for (e in names(eras)[1:2]) {
    s <- if (grepl("Aqua", e)) "Aqua" else "SNPP"
    x <- dat[dat$month >= eras[[e]][1] & dat$month <= eras[[e]][2], ]
    cor_rows[[length(cor_rows) + 1]] <- data.frame(
      scale = "comuna-month", zone = if (scope == "all") "all four regions" else sprintf("region_%02d", as.integer(scope)),
      period = e, series = s, n = nrow(x),
      spearman_vs_conaf_fires = sp(x[[s]], x$conaf_fires), spearman_vs_conaf_area = sp(x[[s]], x$conaf_ha))
  }
}
cors <- do.call(rbind, cor_rows)

# ---------- C. coarse hit rate: hotspot in the same comuna and month as the fire start ----------
conaf$cls <- cut(conaf$sup_total_ha, c(-Inf, 1, 10, 200, Inf), right = FALSE,
                 labels = c("< 1 ha", "1-10 ha", "10-200 ha", ">= 200 ha"))
kf <- paste(conaf$cod_comuna, conaf$month)
for (s in c("Aqua", "SNPP")) { x <- cc[cc$satellite == s, ]; v <- x$n_hotspots[match(kf, paste(x$cod_comuna, x$month))]; conaf[[paste0("hit_", s)]] <- !is.na(v) & v > 0 }
hit_rows <- list()
for (cl in levels(conaf$cls)) for (e in c("aqua_era", "snpp_era_both_sensors")) {
  x <- conaf[conaf$cls == cl & (if (e == "aqua_era") conaf$month <= "2012-01" else conaf$month >= SNPP_START), ]
  hit_rows[[length(hit_rows) + 1]] <- data.frame(area_class = cl,
    fires_period = if (e == "aqua_era") "2002-07 to 2012-01" else "2012-02 to 2020-06", fires = nrow(x),
    hit_rate_aqua = mean(x$hit_Aqua), hit_rate_snpp = if (e == "aqua_era") NA else mean(x$hit_SNPP))
}
hits <- do.call(rbind, hit_rows)
large_by_region <- do.call(rbind, lapply(names(REG), function(r) {
  x <- conaf[conaf$codregion == as.integer(r) & conaf$cls == ">= 200 ha", ]
  data.frame(zone = sprintf("region_%02d", as.integer(r)), fires_200ha_or_more = nrow(x),
             hit_rate_aqua_2002_2020 = mean(x$hit_Aqua),
             fires_200ha_2012_2020 = sum(x$month >= SNPP_START),
             hit_rate_snpp_2012_2020 = mean(x$hit_SNPP[x$month >= SNPP_START]))
}))

# ---------- save ----------
r3 <- function(df) { for (j in names(df)) if (is.double(df[[j]])) df[[j]] <- round(df[[j]], 3); df }
write.csv(r3(jumps), file.path(out, "jump_at_2012_vs_conaf.csv"), row.names = FALSE)
write.csv(r3(cors), file.path(out, "spearman_vs_conaf.csv"), row.names = FALSE)
write.csv(r3(hits), file.path(out, "hit_rate_comuna_month.csv"), row.names = FALSE)
write.csv(r3(large_by_region), file.path(out, "hit_rate_200ha_by_region.csv"), row.names = FALSE)
write.csv(r3(rm_tab[, c("codregion", "month", "season", "conaf_fires", "conaf_ha", "hot_raw", "hot_harmonized", "era_snpp")]),
          file.path(out, "region_month_conaf_vs_hotspots.csv"), row.names = FALSE)

# ---------- figure (English) ----------
png(file.path(out, "conaf_validation.png"), width = 2100, height = 1100, res = 150)
layout(matrix(c(1, 2), 1), widths = c(1.15, 1))
par(mar = c(5, 9, 4, 1))
zl <- c("all four regions" = "All four regions", region_07 = "Maule", region_08 = "Biob\u00edo",
        region_09 = "Araucan\u00eda", region_16 = "\u00d1uble")
zs <- names(zl); yy <- rev(seq_along(zs))
plot(NA, xlim = c(0.5, 8), ylim = c(0.5, length(zs) + .5), log = "x", yaxt = "n", xlab = "Jump in hotspots per unit of CONAF fire activity at 2012 (x)",
     ylab = "", main = "Does the 2012 sensor change create a false jump?")
axis(2, at = yy, labels = zl[zs], las = 1)
abline(v = 1, lty = 2, col = "grey40")
for (i in seq_along(zs)) {
  for (y in c("unharmonized", "harmonized")) {
    j <- jumps[jumps$zone == zs[i] & grepl(paste0("^", y), jumps$series), ]
    off <- if (y == "unharmonized") .15 else -.15; col <- if (y == "unharmonized") "#1c7ed6" else "#2f9e44"
    segments(j$ci95_low, yy[i] + off, j$ci95_high, yy[i] + off, col = col, lwd = 2)
    points(j$jump_factor_at_2012, yy[i] + off, pch = 19, col = col, cex = 1.3)
  }
}
legend("topright", bty = "n", pch = 19, col = c("#1c7ed6", "#2f9e44"), cex = .85,
       legend = c("Unharmonized: Aqua, then Suomi NPP", "Harmonized: Suomi NPP-equivalent"))
mtext("Point = estimate, line = 95 % CI (bootstrap by season). 1 = no jump.", side = 1, line = 3.8, cex = .7, col = "grey40")

par(mar = c(5, 4.5, 4, 1))
h <- hits[hits$fires_period == "2012-02 to 2020-06", ]; h0 <- hits[hits$fires_period == "2002-07 to 2012-01", ]
m <- rbind(h0$hit_rate_aqua, h$hit_rate_aqua, h$hit_rate_snpp) * 100
bp <- barplot(m, beside = TRUE, names.arg = h$area_class, ylim = c(0, 115), col = c("#a5d8ff", "#1c7ed6", "#d9480f"), border = NA,
              ylab = "CONAF fires with a hotspot in the same comuna and month (%)", main = "Hit rate by fire size (coarse)")
text(bp, m + 4, sprintf("%.0f", m), cex = .75)
legend("topleft", bty = "n", cex = .8, fill = c("#a5d8ff", "#1c7ed6", "#d9480f"), border = NA,
       legend = c("MODIS Aqua, fires 2002-2012", "MODIS Aqua, fires 2012-2020", "VIIRS Suomi NPP, fires 2012-2020"))
mtext(sprintf("CONAF fires, seasons 2002-03 to 2019-20, regions 7, 8, 9 and 16 (%s fires).", format(nrow(conaf), big.mark = ",")),
      side = 1, line = 3.8, cex = .7, col = "grey40")
invisible(dev.off())

print(r3(jumps), row.names = FALSE)
print(r3(cors), row.names = FALSE)
print(r3(hits), row.names = FALSE)
print(r3(large_by_region), row.names = FALSE)
