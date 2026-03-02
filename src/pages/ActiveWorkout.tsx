import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useSettings } from "@/hooks/useSettings";
import { defaultExercises } from "@/utils/exerciseData";
import {
  DayName,
  WorkoutExercise,
  WorkoutSet,
  PlannedExercise,
} from "@/utils/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Timer,
  Pause,
  Play,
  Minus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  pageVariants,
  listContainerVariants,
  listItemVariants,
} from "@/utils/animations";
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

const exerciseMap = Object.fromEntries(defaultExercises.map((e) => [e.id, e]));

export default function ActiveWorkoutPage() {
  const { day } = useParams<{ day: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { plan, updateDayExercises } = useWeeklyPlan();
  const { addWorkout, getLastPerformance } = useWorkoutHistory();
  const { settings } = useSettings();

  const dayPlan = plan.find((d) => d.day === day);

  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [originalPlan, setOriginalPlan] = useState<PlannedExercise[]>([]);
  const [startTime] = useState(() => {
    const state = location.state as { startTime?: number } | null;
    return state?.startTime ?? Date.now();
  });
  const [elapsed, setElapsed] = useState(0);
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingWorkout, setPendingWorkout] = useState<any>(null);
  const [revealedSet, setRevealedSet] = useState<string | null>(null);

  // Rest timer state
  const [restTimer, setRestTimer] = useState<{
    exIdx: number;
    timeLeft: number;
    isPaused: boolean;
  } | null>(null);
  const [exerciseRestTimes, setExerciseRestTimes] = useState<number[]>([]);

  // Initialize exercises from plan
  useEffect(() => {
    if (!dayPlan) return;
    // Store original plan for comparison
    setOriginalPlan(JSON.parse(JSON.stringify(dayPlan.exercises)));

    const init: WorkoutExercise[] = dayPlan.exercises.map((pe) => {
      const prev = getLastPerformance(pe.exerciseId);
      const sets: WorkoutSet[] = Array.from({ length: pe.sets }, (_, i) => ({
        setNumber: i + 1,
        previous: prev?.[i]
          ? { weight: prev[i].weight, reps: prev[i].reps }
          : undefined,
        weight: prev?.[i]?.weight ?? 0,
        reps: prev?.[i]?.reps ?? pe.reps,
        completed: false,
      }));
      return { exerciseId: pe.exerciseId, sets };
    });
    setExercises(init);

    // Initialize rest times for each exercise
    const restTimes = dayPlan.exercises.map(
      (pe) => pe.restTime ?? settings.defaultRestTime * 60,
    );
    setExerciseRestTimes(restTimes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle exercises added from ExerciseLibrary
  useEffect(() => {
    const state = location.state as { addExercises?: string[] } | null;
    if (state?.addExercises && state.addExercises.length > 0) {
      const newExercises: WorkoutExercise[] = state.addExercises.map(
        (exerciseId) => {
          const prev = getLastPerformance(exerciseId);
          const sets: WorkoutSet[] = Array.from(
            { length: settings.defaultSets },
            (_, i) => ({
              setNumber: i + 1,
              previous: prev?.[i]
                ? { weight: prev[i].weight, reps: prev[i].reps }
                : undefined,
              weight: prev?.[i]?.weight ?? 0,
              reps: prev?.[i]?.reps ?? 10,
              completed: false,
            }),
          );
          return { exerciseId, sets };
        },
      );

      setExercises((prev) => [...prev, ...newExercises]);

      // Add default rest times for new exercises
      setExerciseRestTimes((prev) => [
        ...prev,
        ...new Array(newExercises.length).fill(settings.defaultRestTime * 60),
      ]);

      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [
    location.state,
    location.pathname,
    navigate,
    getLastPerformance,
    settings.defaultSets,
    settings.defaultRestTime,
  ]);

  // Timer
  useEffect(() => {
    const interval = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTime) / 1000)),
      1000,
    );
    return () => clearInterval(interval);
  }, [startTime]);

  // Rest timer
  useEffect(() => {
    if (!restTimer || restTimer.isPaused) return;

    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev || prev.isPaused) return prev;

        if (prev.timeLeft <= 1) {
          // Timer reached 0
          toast.success("¡Descanso terminado! Listo para la siguiente serie", {
            duration: 5000,
          });
          return null;
        }

        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimer]);

  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (s, e) => s + e.sets.filter((s) => s.completed).length,
    0,
  );

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof WorkoutSet,
    value: any,
  ) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si === setIdx ? { ...s, [field]: value } : s,
              ),
            }
          : ex,
      ),
    );

    // If completing a set, start rest timer
    if (field === "completed" && value === true) {
      startRestTimer(exIdx);
    }
  };

  const startRestTimer = (exIdx: number) => {
    const restTime = exerciseRestTimes[exIdx] ?? settings.defaultRestTime * 60;

    // Don't start timer if rest time is 0
    if (restTime === 0) return;

    setRestTimer({
      exIdx,
      timeLeft: restTime,
      isPaused: false,
    });
  };

  const updateRestTime = (exIdx: number, seconds: number) => {
    setExerciseRestTimes((prev) => {
      const newTimes = [...prev];
      newTimes[exIdx] = seconds;
      return newTimes;
    });
  };

  const toggleRestTimer = () => {
    if (restTimer) {
      setRestTimer({ ...restTimer, isPaused: !restTimer.isPaused });
    }
  };

  const cancelRestTimer = () => {
    setRestTimer(null);
  };

  const adjustRestTimer = (seconds: number) => {
    if (restTimer) {
      setRestTimer({
        ...restTimer,
        timeLeft: Math.max(0, restTimer.timeLeft + seconds),
      });
    }
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIdx
          ? {
              ...ex,
              sets: [
                ...ex.sets,
                {
                  setNumber: ex.sets.length + 1,
                  weight: 0,
                  reps: 10,
                  completed: false,
                },
              ],
            }
          : ex,
      ),
    );
  };

  const deleteSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) =>
        ei === exIdx
          ? {
              ...ex,
              sets: ex.sets
                .filter((_, si) => si !== setIdx)
                .map((s, i) => ({ ...s, setNumber: i + 1 })),
            }
          : ex,
      ),
    );
  };

  const deleteExercise = (exIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
    setExerciseRestTimes((prev) => prev.filter((_, i) => i !== exIdx));

    // Cancel rest timer if it's active for this exercise
    if (restTimer?.exIdx === exIdx) {
      setRestTimer(null);
    }
  };

  // Check if structure has changed (different exercises or different number of sets)
  const hasStructuralChanges = () => {
    if (exercises.length !== originalPlan.length) return true;

    for (let i = 0; i < exercises.length; i++) {
      const current = exercises[i];
      const original = originalPlan[i];

      if (current.exerciseId !== original.exerciseId) return true;
      if (current.sets.length !== original.sets) return true;
    }

    return false;
  };

  const applyChangesToPlan = () => {
    const updatedExercises: PlannedExercise[] = exercises.map((ex, idx) => {
      const original =
        originalPlan.find((o) => o.exerciseId === ex.exerciseId) ||
        originalPlan[idx];
      return {
        id: original?.id || `${day}-${ex.exerciseId}-${Date.now()}`,
        exerciseId: ex.exerciseId,
        sets: ex.sets.length,
        reps: original?.reps || 10,
        restTime: exerciseRestTimes[idx],
      };
    });

    updateDayExercises(day as DayName, updatedExercises);
  };

  const applyRestTimesOnly = () => {
    // Only update rest times for existing exercises in the original plan
    const updatedExercises: PlannedExercise[] = originalPlan.map(
      (original, idx) => {
        const currentExIdx = exercises.findIndex(
          (e) => e.exerciseId === original.exerciseId,
        );
        return {
          ...original,
          restTime:
            currentExIdx >= 0
              ? exerciseRestTimes[currentExIdx]
              : original.restTime,
        };
      },
    );

    updateDayExercises(day as DayName, updatedExercises);
  };

  const handleFinish = () => {
    const workout = {
      id: `w-${Date.now()}`,
      day: day as DayName,
      label: dayPlan?.label,
      date: new Date().toISOString(),
      durationSeconds: elapsed,
      exercises,
    };

    // Check if there are structural changes
    if (hasStructuralChanges()) {
      setPendingWorkout(workout);
      setShowChangesDialog(true);
    } else {
      // Only save rest times if no structural changes
      applyRestTimesOnly();
      addWorkout(workout);
      navigate(`/summary/${workout.id}`, { state: workout });
    }
  };

  const handleApplyChanges = () => {
    applyChangesToPlan();
    if (pendingWorkout) {
      addWorkout(pendingWorkout);
      navigate(`/summary/${pendingWorkout.id}`, { state: pendingWorkout });
    }
  };

  const handleDiscardChanges = () => {
    // Save only rest times for original exercises
    applyRestTimesOnly();
    if (pendingWorkout) {
      addWorkout(pendingWorkout);
      navigate(`/summary/${pendingWorkout.id}`, { state: pendingWorkout });
    }
  };

  const handleExitClick = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    setShowExitDialog(false);
    navigate("/");
  };

  const handleSaveAndExit = () => {
    const workout = {
      id: `w-${Date.now()}`,
      day: day as DayName,
      label: dayPlan?.label,
      date: new Date().toISOString(),
      durationSeconds: elapsed,
      exercises,
    };

    // Apply changes based on whether there are structural changes
    if (hasStructuralChanges()) {
      applyChangesToPlan();
    } else {
      applyRestTimesOnly();
    }

    addWorkout(workout);
    setShowExitDialog(false);
    navigate(`/summary/${workout.id}`, { state: workout });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}min ${sec}s`;
  };

  if (!dayPlan) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto text-center">
        <p>No se encontró el plan para este día.</p>
        <Button className="mt-4" onClick={() => navigate("/")}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleExitClick}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">
                {day}
                {dayPlan?.label && (
                  <span className="text-primary"> - {dayPlan.label}</span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">
                {formatTime(elapsed)}
              </p>
            </div>
          </div>
          <Button
            size="icon"
            onClick={handleFinish}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Check className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>
              {completedSets} de {totalSets} series
            </span>
            <span>
              {totalSets > 0
                ? Math.round((completedSets / totalSets) * 100)
                : 0}
              %
            </span>
          </div>
          <Progress
            value={totalSets > 0 ? (completedSets / totalSets) * 100 : 0}
            className="h-2"
          />
        </motion.div>
      </div>

      {/* Scrollable Content */}
      <div className="px-4 pb-8 pt-4">
        {/* Exercise cards */}
        <motion.div
          className="space-y-4"
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {exercises.map((ex, exIdx) => {
              const data = exerciseMap[ex.exerciseId];
              if (!data) return null;

              return (
                <motion.div
                  key={`${ex.exerciseId}-${exIdx}`}
                  variants={listItemVariants}
                  exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                  layout
                >
                  <Card className="p-4" onClick={() => setRevealedSet(null)}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          IMG
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{data.name}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {data.muscleGroup}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteExercise(exIdx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Rest time editor */}
                    <div className="flex items-center gap-2 mb-3">
                      <Timer className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Descanso:
                      </span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={Math.floor((exerciseRestTimes[exIdx] || 0) / 60)}
                        onChange={(e) => {
                          const minutes = Math.max(
                            0,
                            Math.min(59, Number(e.target.value)),
                          );
                          const seconds = (exerciseRestTimes[exIdx] || 0) % 60;
                          updateRestTime(exIdx, minutes * 60 + seconds);
                        }}
                        className="h-7 w-12 text-xs text-center px-1"
                      />
                      <span className="text-xs text-muted-foreground">m</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={(exerciseRestTimes[exIdx] || 0) % 60}
                        onChange={(e) => {
                          const minutes = Math.floor(
                            (exerciseRestTimes[exIdx] || 0) / 60,
                          );
                          const seconds = Math.max(
                            0,
                            Math.min(59, Number(e.target.value)),
                          );
                          updateRestTime(exIdx, minutes * 60 + seconds);
                        }}
                        className="h-7 w-12 text-xs text-center px-1"
                      />
                      <span className="text-xs text-muted-foreground">s</span>
                    </div>

                    {/* Sets table */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-[2rem_3rem_1fr_1fr_2rem] gap-1 text-[10px] font-semibold text-muted-foreground px-1">
                        <span className="text-center">Serie</span>
                        <span className="text-center">Previo</span>
                        <span className="text-center">
                          Peso ({settings.defaultUnit})
                        </span>
                        <span className="text-center">Reps</span>
                        <span className="text-center">✓</span>
                      </div>
                      <AnimatePresence mode="popLayout">
                        {ex.sets.map((set, setIdx) => {
                          const setKey = `${exIdx}-${setIdx}`;
                          const isRevealed = revealedSet === setKey;

                          return (
                            <div
                              key={setKey}
                              className="relative h-8 rounded overflow-hidden"
                            >
                              {/* Background red for delete */}
                              {ex.sets.length > 1 && (
                                <div className="absolute inset-0 bg-destructive flex items-center justify-end pr-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-3 text-destructive-foreground hover:bg-destructive-foreground/20"
                                    onClick={() => {
                                      deleteSet(exIdx, setIdx);
                                      setRevealedSet(null);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}

                              {/* Swipeable content */}
                              <motion.div
                                drag={ex.sets.length > 1 ? "x" : false}
                                dragConstraints={{ left: -80, right: 0 }}
                                dragElastic={{ left: 0.1, right: 0 }}
                                dragMomentum={false}
                                dragDirectionLock
                                animate={{ x: isRevealed ? -80 : 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 30,
                                }}
                                onDragEnd={(_, info) => {
                                  if (ex.sets.length > 1) {
                                    if (info.offset.x < -40) {
                                      setRevealedSet(setKey);
                                    } else if (info.offset.x > 10) {
                                      setRevealedSet(null);
                                    }
                                  }
                                }}
                                onDragStart={() => {
                                  if (revealedSet && revealedSet !== setKey) {
                                    setRevealedSet(null);
                                  }
                                }}
                                className="absolute inset-0 grid grid-cols-[2rem_3rem_1fr_1fr_2rem] gap-1 items-center px-1 bg-card touch-draggable"
                                style={{ touchAction: "pan-y" }}
                                initial={{ opacity: 1, x: 0 }}
                                exit={{
                                  opacity: 0,
                                  y: -10,
                                  transition: { duration: 0.15 },
                                }}
                              >
                                <span className="text-xs text-center pointer-events-none">
                                  {set.setNumber}
                                </span>
                                <span className="text-xs text-muted-foreground text-center pointer-events-none">
                                  {set.previous
                                    ? `${set.previous.weight}×${set.previous.reps}`
                                    : "-"}
                                </span>
                                <div
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Input
                                    type="number"
                                    value={set.weight || ""}
                                    onChange={(e) =>
                                      updateSet(
                                        exIdx,
                                        setIdx,
                                        "weight",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="h-8 text-xs text-center px-1"
                                  />
                                </div>
                                <div
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Input
                                    type="number"
                                    value={set.reps || ""}
                                    onChange={(e) =>
                                      updateSet(
                                        exIdx,
                                        setIdx,
                                        "reps",
                                        Number(e.target.value),
                                      )
                                    }
                                    className="h-8 text-xs text-center px-1"
                                  />
                                </div>
                                <div
                                  className="flex justify-center"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={set.completed}
                                    onCheckedChange={(v) =>
                                      updateSet(exIdx, setIdx, "completed", v)
                                    }
                                  />
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRevealedSet(null);
                        addSet(exIdx);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Agregar serie
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => {
            setRevealedSet(null);
            navigate(`/exercises?fromWorkout=${day}`, {
              state: { startTime },
            });
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Agregar ejercicio
        </Button>
      </div>

      {/* Changes confirmation dialog */}
      <AlertDialog open={showChangesDialog} onOpenChange={setShowChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Aplicar cambios a la rutina?</AlertDialogTitle>
            <AlertDialogDescription>
              Has modificado la estructura del entrenamiento (ejercicios o
              series). ¿Deseas aplicar estos cambios a tu rutina semanal o
              mantener la rutina original?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardChanges}>
              Descartar cambios
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyChanges}>
              Aplicar a la rutina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Qué deseas hacer?</AlertDialogTitle>
            <AlertDialogDescription>
              Puedes guardar tu progreso y finalizar el entrenamiento, o
              descartarlo completamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              onClick={handleSaveAndExit}
              className="w-full m-0"
            >
              Guardar y finalizar
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleConfirmExit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full m-0"
            >
              Descartar entrenamiento
            </AlertDialogAction>
            <AlertDialogCancel className="w-full m-0">
              Continuar entrenando
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fixed Rest Timer at Bottom */}
      <AnimatePresence>
        {restTimer && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
          >
            <div className="max-w-2xl mx-auto px-4 pb-4 pointer-events-auto">
              <Card className="p-3 bg-primary/20 border-primary shadow-lg backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="text-2xl font-bold text-primary tabular-nums">
                      {Math.floor(restTimer.timeLeft / 60)}:
                      {String(restTimer.timeLeft % 60).padStart(2, "0")}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjustRestTimer(-15)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => adjustRestTimer(15)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={toggleRestTimer}
                    >
                      {restTimer.isPaused ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={cancelRestTimer}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
