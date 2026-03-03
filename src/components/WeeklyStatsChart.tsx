import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompletedWorkout } from "@/utils/types";
import { useSettings } from "@/hooks/useSettings";
import { convertWeight } from "@/utils/unitConversion";
import { motion, AnimatePresence } from "framer-motion";

interface WeeklyStatsChartProps {
  history: CompletedWorkout[];
}

type Mode = "volume" | "time";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function WeeklyStatsChart({ history }: WeeklyStatsChartProps) {
  const { settings } = useSettings();
  const unit = settings?.defaultUnit ?? "kg";

  const [mode, setMode] = useState<Mode>("volume");
  const [monthOffset, setMonthOffset] = useState(0);
  // null = show month total; number = index of selected week bucket
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);

  // Calculate the first day of the viewed month based on offset
  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const isCurrentMonth = monthOffset === 0;

  // Reset selection when navigating months or switching modes
  const handleSetMonthOffset = (fn: (o: number) => number) => {
    setSelectedBucket(null);
    setMonthOffset(fn);
  };
  const handleSetMode = (m: Mode) => {
    setSelectedBucket(null);
    setMode(m);
  };

  const weekBuckets = useMemo(() => {
    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(viewYear, viewMonth + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    let cursor = getWeekStart(monthStart);
    const buckets: { label: string; start: Date; end: Date }[] = [];

    while (cursor <= monthEnd) {
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const displayDay = cursor < monthStart ? monthStart : cursor;
      buckets.push({
        label: String(displayDay.getDate()),
        start: new Date(cursor),
        end: weekEnd,
      });

      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() + 7);
    }

    return buckets;
  }, [viewYear, viewMonth]);

  const volumeByDay = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((w) => {
      const key = toLocalDateKey(new Date(w.date));
      const vol = w.exercises.reduce((exVol, ex) => {
        const exUnit = ex.unit ?? unit;
        return (
          exVol +
          ex.sets
            .filter((s) => s.completed)
            .reduce(
              (sv, s) => sv + convertWeight(s.weight, exUnit, unit) * s.reps,
              0,
            )
        );
      }, 0);
      map.set(key, (map.get(key) ?? 0) + vol);
    });
    return map;
  }, [history, unit]);

  const secondsByDay = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((w) => {
      const key = toLocalDateKey(new Date(w.date));
      map.set(key, (map.get(key) ?? 0) + w.durationSeconds);
    });
    return map;
  }, [history]);

  const bucketValues = useMemo(() => {
    return weekBuckets.map(({ start, end }) => {
      let total = 0;
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = toLocalDateKey(cursor);
        total +=
          mode === "volume"
            ? (volumeByDay.get(key) ?? 0)
            : (secondsByDay.get(key) ?? 0) / 3600;
        cursor.setDate(cursor.getDate() + 1);
      }
      return total;
    });
  }, [weekBuckets, mode, volumeByDay, secondsByDay]);

  // realMax: actual maximum across buckets (0 if no data).
  // Used to decide time axis unit — must NOT fall back to 1 so that
  // "all sessions < 1h" correctly renders the axis in minutes.
  const realMax = Math.max(...bucketValues, 0);
  // maxValue: used for bar height scaling — fallback to 1 avoids division by zero.
  const maxValue = Math.max(realMax, 1);
  const monthTotal = bucketValues.reduce((a, b) => a + b, 0);

  const monthDays = useMemo(() => {
    const daySet = new Set<string>();
    weekBuckets.forEach(({ start, end }) => {
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = toLocalDateKey(cursor);
        if ((volumeByDay.get(key) ?? 0) > 0 || (secondsByDay.get(key) ?? 0) > 0)
          daySet.add(key);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return daySet.size;
  }, [weekBuckets, volumeByDay, secondsByDay]);

  const today = new Date();
  const currentWeekStart = getWeekStart(today);

  // The value shown in the header: selected week or month total
  const displayValue =
    selectedBucket !== null ? bucketValues[selectedBucket] : monthTotal;
  const displayDays =
    selectedBucket !== null
      ? (() => {
          const { start, end } = weekBuckets[selectedBucket];
          const daySet = new Set<string>();
          const cursor = new Date(start);
          while (cursor <= end) {
            const key = toLocalDateKey(cursor);
            if (
              (volumeByDay.get(key) ?? 0) > 0 ||
              (secondsByDay.get(key) ?? 0) > 0
            )
              daySet.add(key);
            cursor.setDate(cursor.getDate() + 1);
          }
          return daySet.size;
        })()
      : monthDays;
  const displayLabel =
    selectedBucket !== null
      ? (() => {
          const { start, end } = weekBuckets[selectedBucket];
          const fmt = (d: Date) =>
            d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
          // Clamp to month boundaries for display
          const monthStart = new Date(viewYear, viewMonth, 1);
          const monthEnd = new Date(viewYear, viewMonth + 1, 0);
          const clampedStart = start < monthStart ? monthStart : start;
          const clampedEnd = end > monthEnd ? monthEnd : end;
          return `${fmt(clampedStart)} – ${fmt(clampedEnd)}`;
        })()
      : `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  // For time mode: decide axis unit based on maxValue (hours).
  // If max weekly time >= 1h → show in hours; otherwise show in minutes.
  // Use realMax so that months with only short sessions stay in minutes.
  const timeAxisInHours = mode === "time" && realMax >= 1;

  const formatTotal = (val: number) => {
    if (mode === "time") {
      const h = Math.floor(val);
      const m = Math.round((val - h) * 60);
      if (h === 0) return `${m} min`;
      if (m === 0) return `${h} h`;
      return `${h} h ${m} min`;
    }
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k ${unit}`;
    return `${Math.round(val)} ${unit}`;
  };

  const BAR_MAX_H = 100;
  const Y_TICK_RATIOS = [1, 0.66, 0.33, 0];

  const formatYTick = (ratio: number) => {
    const val = ratio * maxValue;

    if (mode === "time") {
      if (timeAxisInHours) {
        // Show in hours with "hrs" suffix always
        const formatted = Number.isInteger(val) ? val : val.toFixed(1);
        return `${formatted} hrs`;
      } else {
        // Show in minutes with "min" suffix always (maxValue < 1h, so val*60 is minutes)
        return `${Math.round(val * 60)} min`;
      }
    }

    // Volume mode — always append unit
    if (val >= 1000) {
      const k = val / 1000;
      return `${k % 1 === 0 ? k : k.toFixed(1)}k ${unit}`;
    }
    return `${Math.round(val)} ${unit}`;
  };

  return (
    <div className="rounded-2xl border bg-card overflow-hidden mb-6 px-1">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div>
          <AnimatePresence mode="wait">
            <motion.p
              key={displayLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="text-sm font-medium text-muted-foreground my-1"
            >
              {displayLabel}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${displayValue}-${mode}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="text-lg font-semibold tabular-nums"
            >
              {formatTotal(displayValue)}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={displayDays}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="text-sm text-muted-foreground my-1"
            >
              {displayDays}{" "}
              {displayDays === 1 ? "día entrenado" : "días entrenados"}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-end gap-6">
          {/* Mode toggle */}
          <div className="flex rounded-xl border overflow-hidden">
            <button
              onClick={() => handleSetMode("volume")}
              className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium transition-colors ${
                mode === "volume"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Volumen
            </button>
            <button
              onClick={() => handleSetMode("time")}
              className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium transition-colors ${
                mode === "time"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tiempo
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-1">
            {!isCurrentMonth && (
              <button
                onClick={() => {
                  setMonthOffset(0);
                  setSelectedBucket(null);
                }}
                className="text-sm h-7 px-2 text-primary font-medium min-h-[28px]"
              >
                Hoy
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleSetMonthOffset((o) => o - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isCurrentMonth}
              onClick={() => handleSetMonthOffset((o) => o + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pb-4 pt-4">
        <div className="flex gap-2">
          {/* Y-axis — wider to fit "1.2k kg" style labels */}
          <div
            className="relative flex-shrink-0 w-12"
            style={{ height: BAR_MAX_H + 24 }}
          >
            {Y_TICK_RATIOS.map((ratio) => (
              <span
                key={ratio}
                className="absolute right-0 text-[11px] text-muted-foreground/80 tabular-nums leading-none whitespace-nowrap"
                style={{
                  top: (1 - ratio) * BAR_MAX_H,
                  transform: "translateY(-50%)",
                }}
              >
                {formatYTick(ratio)}
              </span>
            ))}
          </div>

          {/* Bars + grid */}
          <div className="flex-1 relative">
            {/* Grid lines */}
            {Y_TICK_RATIOS.map((ratio) => (
              <div
                key={ratio}
                className="absolute inset-x-0 border-t border-dashed pointer-events-none"
                style={{
                  top: (1 - ratio) * BAR_MAX_H,
                  borderColor: "hsl(var(--border) / 0.5)",
                }}
              />
            ))}

            {/* Bars */}
            <div className="flex items-end justify-between gap-1.5">
              {weekBuckets.map((bucket, i) => {
                const val = bucketValues[i];
                const barH =
                  val > 0 ? Math.max(4, (val / maxValue) * BAR_MAX_H) : 0;
                const isCurrentBucket =
                  isCurrentMonth &&
                  currentWeekStart >= bucket.start &&
                  currentWeekStart <= bucket.end;

                const isSelected = selectedBucket === i;

                return (
                  <button
                    key={i}
                    className="flex flex-col items-center gap-1.5 flex-1 focus:outline-none"
                    onClick={() =>
                      setSelectedBucket((prev) => (prev === i ? null : i))
                    }
                  >
                    <div
                      className="w-full rounded-t-md flex items-end overflow-hidden"
                      style={{ height: BAR_MAX_H }}
                    >
                      <motion.div
                        key={`${monthOffset}-${mode}-${i}`}
                        initial={{ height: 0 }}
                        animate={{ height: barH }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 28,
                          delay: i * 0.06,
                        }}
                        className="w-full rounded-t-md transition-opacity duration-150"
                        style={{
                          backgroundColor:
                            val > 0
                              ? isCurrentBucket
                                ? "hsl(var(--primary))"
                                : "hsl(var(--primary) / 0.55)"
                              : "hsl(var(--muted))",
                          // Dim unselected bars when one is selected
                          opacity:
                            selectedBucket !== null && !isSelected ? 0.35 : 1,
                          // Ring on selected bar
                          outline: isSelected
                            ? "2px solid hsl(var(--primary))"
                            : "none",
                          outlineOffset: "2px",
                        }}
                      />
                    </div>

                    {/* Week start day */}
                    <span
                      className={`text-xs font-medium leading-none transition-colors ${
                        isSelected
                          ? "text-primary font-semibold"
                          : isCurrentBucket
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      {bucket.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
