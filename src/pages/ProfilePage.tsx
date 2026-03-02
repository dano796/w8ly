import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useSettings } from "@/hooks/useSettings";
import WorkoutCalendar from "@/components/WorkoutCalendar";
import WeeklyStatsChart from "@/components/WeeklyStatsChart";
import { formatWorkoutDate } from "@/utils/formatWorkoutDate";
import { Profile, CompletedWorkout } from "@/utils/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  pageVariants,
  listContainerVariants,
  listItemVariants,
} from "@/utils/animations";
import {
  User,
  Calendar,
  Clock,
  Dumbbell,
  Edit2,
  Flame,
  TrendingUp,
  Target,
} from "lucide-react";
import { convertWeight } from "@/utils/unitConversion";
import { defaultExercises } from "@/utils/exerciseData";
import { useCustomExercises } from "@/hooks/useCustomExercises";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { customExercises } = useCustomExercises();
  const [profile, setProfile] = useLocalStorage<Profile>("w8ly-profile", {
    name: "",
    email: "",
  });
  const { history } = useWorkoutHistory();
  const { settings } = useSettings();

  // Combine default and custom exercises
  const allExercises = [...defaultExercises, ...customExercises];
  const exerciseMap = Object.fromEntries(allExercises.map((e) => [e.id, e]));

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempName, setTempName] = useState("");
  const [localHistory, setLocalHistory] = useState<CompletedWorkout[]>(history);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Update history when page becomes visible or when history prop changes
  useEffect(() => {
    setLocalHistory(history);
  }, [history]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Re-read from localStorage when page becomes visible
        try {
          const stored = window.localStorage.getItem("w8ly-workout-history");
          if (stored) {
            setLocalHistory(JSON.parse(stored));
          }
        } catch (e) {
          console.error("Error reading workout history:", e);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleSave = () => {
    const trimmedName = tempName.trim();
    if (!trimmedName) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    setProfile({ ...profile, name: trimmedName });
    setIsDialogOpen(false);
    toast.success("Perfil actualizado");
  };

  const handleOpenDialog = () => {
    setTempName(profile.name || "");
    setIsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} s`;
  };

  const getInitial = () => {
    return (profile.name || "U").charAt(0).toUpperCase();
  };

  const totalWorkouts = localHistory.length;
  const recentWorkouts = localHistory.slice(0, 10);

  // Calculate stats
  const totalSets = localHistory.reduce((sum, workout) => {
    return (
      sum +
      workout.exercises.reduce(
        (exSum, ex) => exSum + ex.sets.filter((s) => s.completed).length,
        0,
      )
    );
  }, 0);

  const totalTime = localHistory.reduce(
    (sum, workout) => sum + workout.durationSeconds,
    0,
  );

  const totalTimeFormatted = () => {
    const hours = Math.floor(totalTime / 3600);
    const mins = Math.floor((totalTime % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const avgDuration =
    totalWorkouts > 0 ? Math.floor(totalTime / totalWorkouts / 60) : 0;

  const uniqueExercises = new Set(
    localHistory.flatMap((workout) =>
      workout.exercises
        .filter((ex) => ex.sets.some((s) => s.completed))
        .map((ex) => ex.exerciseId),
    ),
  ).size;

  // Calculate weekly streak
  const getWeekKey = (date: Date) => {
    // Get Monday of the week
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  };

  const calculateWeeklyStreak = () => {
    if (localHistory.length === 0) return { current: 0, best: 0 };

    // Group workouts by week
    const weekMap = new Map<string, boolean>();
    localHistory.forEach((workout) => {
      const weekKey = getWeekKey(new Date(workout.date));
      weekMap.set(weekKey, true);
    });

    // Sort weeks
    const sortedWeeks = Array.from(weekMap.keys()).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );

    if (sortedWeeks.length === 0) return { current: 0, best: 0 };

    // Calculate current streak from most recent week
    const today = new Date();
    const currentWeek = getWeekKey(today);
    const lastWeekDate = new Date(today);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeek = getWeekKey(lastWeekDate);

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Check if current or last week has workouts
    if (sortedWeeks[0] === currentWeek || sortedWeeks[0] === lastWeek) {
      currentStreak = 1;
      tempStreak = 1;

      // Count consecutive weeks backwards
      for (let i = 1; i < sortedWeeks.length; i++) {
        const expectedPrevWeek = new Date(sortedWeeks[i - 1]);
        expectedPrevWeek.setDate(expectedPrevWeek.getDate() - 7);
        const expectedWeekKey = getWeekKey(expectedPrevWeek);

        if (sortedWeeks[i] === expectedWeekKey) {
          currentStreak++;
          tempStreak++;
        } else {
          // Gap found, start counting for best streak
          if (tempStreak > bestStreak) bestStreak = tempStreak;
          tempStreak = 1;
        }
      }
    } else {
      // Current streak is broken, calculate best from history
      tempStreak = 1;
      for (let i = 1; i < sortedWeeks.length; i++) {
        const expectedPrevWeek = new Date(sortedWeeks[i - 1]);
        expectedPrevWeek.setDate(expectedPrevWeek.getDate() - 7);
        const expectedWeekKey = getWeekKey(expectedPrevWeek);

        if (sortedWeeks[i] === expectedWeekKey) {
          tempStreak++;
        } else {
          if (tempStreak > bestStreak) bestStreak = tempStreak;
          tempStreak = 1;
        }
      }
    }

    if (tempStreak > bestStreak) bestStreak = tempStreak;
    if (bestStreak < currentStreak) bestStreak = currentStreak;

    return { current: currentStreak, best: bestStreak };
  };

  const { current: weeklyStreak, best: bestStreak } = calculateWeeklyStreak();

  return (
    <motion.div
      className="px-4 pt-6 pb-24 max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mb-3">
          <span className="text-3xl font-bold text-primary-foreground">
            {getInitial()}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-bold">{profile.name || "Usuario"}</h1>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleOpenDialog}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Actualiza tu nombre de usuario aquí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Ingresa tu nombre"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction onClick={handleSave} className="w-full m-0">
              Guardar cambios
            </AlertDialogAction>
            <AlertDialogCancel className="w-full m-0">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card className="p-4 flex items-center gap-3">
          <Dumbbell className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Entrenamientos</p>
            <p className="text-base font-semibold">{totalWorkouts}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <Target className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Series totales</p>
            <p className="text-base font-semibold">{totalSets}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Tiempo total</p>
            <p className="text-base font-semibold">{totalTimeFormatted()}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Promedio</p>
            <p className="text-base font-semibold">{avgDuration} min</p>
          </div>
        </Card>
      </div>

      {/* Weekly Streak Card */}
      {totalWorkouts > 0 && (
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-3">
            <Flame
              className={`w-8 h-8 ${weeklyStreak > 0 ? "text-orange-500" : "text-muted-foreground"}`}
            />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Racha semanal</p>
              <p className="text-base font-semibold">
                {weeklyStreak > 0
                  ? `${weeklyStreak} ${weeklyStreak === 1 ? "semana" : "semanas"}`
                  : "Sin racha activa"}
              </p>
            </div>
            {bestStreak > 0 && bestStreak > weeklyStreak && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Mejor</p>
                <p className="text-sm font-semibold">{bestStreak}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <WeeklyStatsChart history={localHistory} />
      <WorkoutCalendar history={localHistory} />

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-3">Entrenamientos recientes</h2>
      </div>

      {recentWorkouts.length > 0 ? (
        <motion.div
          className="space-y-3"
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {recentWorkouts.map((workout, idx) => {
            const completedExercises = workout.exercises.filter((ex) =>
              ex.sets.some((s) => s.completed),
            ).length;
            const totalSets = workout.exercises.reduce(
              (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
              0,
            );

            // Formato compacto
            const formattedDay = formatWorkoutDate(workout.date, "compact");

            return (
              <motion.div
                key={workout.id}
                variants={listItemVariants}
                onClick={() =>
                  navigate(`/summary/${workout.id}`, {
                    state: { ...workout, fromProfile: true },
                  })
                }
              >
                <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-base font-semibold truncate max-w-[60%]">
                      {formattedDay}
                      {workout.label && (
                        <span className="text-primary"> - {workout.label}</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {completedExercises}{" "}
                        {completedExercises === 1 ? "ejercicio" : "ejercicios"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {totalSets} {totalSets === 1 ? "serie" : "series"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(workout.durationSeconds)}
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {(() => {
                        const settingsUnit = settings?.defaultUnit || "kg";
                        const volume = workout.exercises.reduce((vol, ex) => {
                          const completedSets = ex.sets.filter(
                            (s) => s.completed,
                          );
                          const exerciseUnit = ex.unit || settingsUnit;
                          return (
                            vol +
                            completedSets.reduce((v, s) => {
                              if (typeof s.weight === "number") {
                                const weightInDefaultUnit = convertWeight(
                                  s.weight,
                                  exerciseUnit,
                                  settingsUnit,
                                );
                                return v + weightInDefaultUnit * s.reps;
                              }
                              return v;
                            }, 0)
                          );
                        }, 0);
                        return `${volume.toLocaleString()} ${settingsUnit}`;
                      })()}
                    </div>
                  </div>

                  {/* Exercise preview */}
                  <div className="flex flex-wrap gap-1">
                    {workout.exercises
                      .filter((ex) => ex.sets.some((s) => s.completed))
                      .slice(0, 3)
                      .map((ex, i) => {
                        const exerciseData = exerciseMap[ex.exerciseId];
                        return exerciseData ? (
                          <Badge key={i} variant="outline" className="text-xs">
                            {exerciseData.name}
                          </Badge>
                        ) : null;
                      })}
                    {completedExercises > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{completedExercises - 3}
                      </Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <Card className="p-8 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Aún no has completado ningún entrenamiento
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            Ir al planificador
          </Button>
        </Card>
      )}
    </motion.div>
  );
}
