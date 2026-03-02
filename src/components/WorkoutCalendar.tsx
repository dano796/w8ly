import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CompletedWorkout } from "@/utils/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface WorkoutCalendarProps {
  history: CompletedWorkout[];
  onSummaryNavigate?: (workout: CompletedWorkout) => void;
}

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

const DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

const toLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function WorkoutCalendar({
  history,
  onSummaryNavigate,
}: WorkoutCalendarProps) {
  const navigate = useNavigate();
  const today = new Date();

  const [viewDate, setViewDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  // Track animation direction for slide
  const [direction, setDirection] = useState(0);

  // Map "YYYY-MM-DD" → CompletedWorkout (most recent if multiple same day)
  const workoutByDay = useMemo(() => {
    const map = new Map<string, CompletedWorkout>();
    // Iterate oldest-first so latest overwrites
    [...history].reverse().forEach((w) => {
      const key = toLocalDateKey(new Date(w.date));
      map.set(key, w);
    });
    return map;
  }, [history]);

  // Days in the current view month
  const calendarDays = useMemo(() => {
    const { month, year } = viewDate;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-first: getDay() returns 0=Sun, so remap
    const startDow = (firstDay.getDay() + 6) % 7; // 0=Mon … 6=Sun
    const totalDays = lastDay.getDate();

    const cells: (number | null)[] = [
      ...Array(startDow).fill(null),
      ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];

    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewDate]);

  const goToPrev = () => {
    setDirection(-1);
    setViewDate((prev) => {
      const m = prev.month === 0 ? 11 : prev.month - 1;
      const y = prev.month === 0 ? prev.year - 1 : prev.year;
      return { month: m, year: y };
    });
  };

  const goToNext = () => {
    setDirection(1);
    setViewDate((prev) => {
      const m = prev.month === 11 ? 0 : prev.month + 1;
      const y = prev.month === 11 ? prev.year + 1 : prev.year;
      return { month: m, year: y };
    });
  };

  const goToToday = () => {
    setDirection(0);
    setViewDate({ month: today.getMonth(), year: today.getFullYear() });
  };

  const isCurrentMonth =
    viewDate.month === today.getMonth() &&
    viewDate.year === today.getFullYear();

  const handleDayClick = (day: number) => {
    const key = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const workout = workoutByDay.get(key);
    if (workout) {
      if (onSummaryNavigate) {
        onSummaryNavigate(workout);
      } else {
        navigate(`/summary/${workout.id}`, { state: workout });
      }
    }
  };

  // Workout intensity: how many completed sets that day (for shade)
  const workoutIntensity = useMemo(() => {
    const map = new Map<string, number>();
    history.forEach((w) => {
      const key = toLocalDateKey(new Date(w.date));
      const sets = w.exercises.reduce(
        (s, ex) => s + ex.sets.filter((set) => set.completed).length,
        0,
      );
      map.set(key, (map.get(key) ?? 0) + sets);
    });
    return map;
  }, [history]);

  const maxIntensity = useMemo(() => {
    return Math.max(1, ...Array.from(workoutIntensity.values()));
  }, [workoutIntensity]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
  };

  return (
    <div className="rounded-2xl border bg-card overflow-hidden px-1 pb-2 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.span
              key={`${viewDate.month}-${viewDate.year}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-base font-semibold w-36 inline-block"
            >
              {MONTH_NAMES[viewDate.month]} {viewDate.year}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              className="text-sm h-7 px-2 text-primary"
              onClick={goToToday}
            >
              Hoy
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-sm font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${viewDate.month}-${viewDate.year}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="grid grid-cols-7 gap-y-1 px-3 pb-4"
        >
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} />;
            }

            const key = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const workout = workoutByDay.get(key);
            const intensity = workoutIntensity.get(key) ?? 0;
            const hasWorkout = !!workout;

            const isToday = isCurrentMonth && day === today.getDate();

            const isFuture =
              new Date(viewDate.year, viewDate.month, day) > today;

            // Intensity-based opacity for the workout dot/fill
            const fillOpacity = hasWorkout
              ? 0.25 + 0.65 * (intensity / maxIntensity)
              : 0;

            return (
              <div
                key={key}
                className="flex items-center justify-center py-0.5"
              >
                <button
                  disabled={!hasWorkout}
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative w-9 h-9 rounded-xl text-sm font-medium
                    flex items-center justify-center
                    transition-all duration-150
                    ${
                      hasWorkout
                        ? "cursor-pointer active:scale-95"
                        : "cursor-default"
                    }
                    ${
                      isToday && !hasWorkout
                        ? "ring-2 ring-primary ring-offset-1 ring-offset-card text-primary font-semibold"
                        : ""
                    }
                    ${isFuture ? "text-muted-foreground/40" : ""}
                    ${!hasWorkout && !isToday && !isFuture ? "text-foreground" : ""}
                  `}
                  style={
                    hasWorkout
                      ? {
                          backgroundColor: `hsl(var(--primary) / ${fillOpacity})`,
                          color:
                            fillOpacity > 0.6
                              ? "hsl(var(--primary-foreground))"
                              : "hsl(var(--foreground))",
                          ...(isToday
                            ? {
                                outline: "2px solid hsl(var(--primary))",
                                outlineOffset: "2px",
                              }
                            : {}),
                        }
                      : {}
                  }
                >
                  {day}
                </button>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-0">
        <span className="text-sm text-muted-foreground">Menos</span>
        <div className="flex gap-1 items-center">
          {[0.25, 0.5, 0.75, 0.9].map((op) => (
            <div
              key={op}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `hsl(var(--primary) / ${op})` }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Más series</span>
      </div>
    </div>
  );
}
