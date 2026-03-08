import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useWorkoutSounds } from "@/hooks/useWorkoutSounds";
import { useWeekDecks } from "@/hooks/useWeekDecks";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useSettings } from "@/hooks/useSettings";
import { useCustomExercises } from "@/hooks/useCustomExercises";
import { useWorkoutTour } from "@/hooks/tours";
import { HelpCircle } from "lucide-react";
import { defaultExercises } from "@/utils/exerciseData";
import { convertWeight } from "@/utils/unitConversion";
import {
  DayName,
  WorkoutExercise,
  WorkoutSet,
  PlannedExercise,
  CompletedWorkout,
  Exercise,
} from "@/utils/types";
import ExerciseDetailSheet from "@/components/ExerciseDetailSheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Trophy,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ActiveWorkoutPage() {
  const { day } = useParams<{ day: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { plan, updateDayExercises } = useWeekDecks();
  const {
    addWorkout,
    getLastPerformance,
    getPersonalRecord,
    getMaxRepsAtWeight,
  } = useWorkoutHistory();
  const { settings } = useSettings();
  const { customExercises } = useCustomExercises();

  // Workout sounds hook
  const { playRestTimer, playAchievement, unlock } = useWorkoutSounds();

  // Combine default and custom exercises
  const allExercises = [...defaultExercises, ...customExercises];
  const exerciseMap = Object.fromEntries(allExercises.map((e) => [e.id, e]));

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
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [pendingWorkout, setPendingWorkout] = useState<CompletedWorkout | null>(
    null,
  );
  const [revealedSet, setRevealedSet] = useState<string | null>(null);

  const [unitChangeDialogExIdx, setUnitChangeDialogExIdx] = useState<
    number | null
  >(null);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Tracks the highest weight completed per exercise THIS session.
  // Key: exerciseId, Value: max weight completed so far this workout.
  const [sessionMaxWeight, setSessionMaxWeight] = useState<
    Record<string, number>
  >({});

  // Rest timer state
  const [restTimer, setRestTimer] = useState<{
    exIdx: number;
    timeLeft: number;
    isPaused: boolean;
  } | null>(null);
  const [exerciseRestTimes, setExerciseRestTimes] = useState<number[]>([]);
  const [previousNotes, setPreviousNotes] = useState<string[]>([]);

  // Workout tour hook
  const { startTour } = useWorkoutTour({
    ready: exercises.length > 0,
  });

  // Initialize exercises from plan
  useEffect(() => {
    if (!dayPlan) return;
    // Store original plan for comparison
    setOriginalPlan(JSON.parse(JSON.stringify(dayPlan.exercises)));

    // Check if we have saved state in sessionStorage
    const savedStateKey = `activeWorkout_${day}`;
    const savedState = sessionStorage.getItem(savedStateKey);

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setExercises(parsed.exercises);
        setExerciseRestTimes(parsed.restTimes);

        // Recalculate previous notes for restored exercises
        const prevNotes = parsed.exercises.map((ex: WorkoutExercise) => {
          const prevExercise = getLastPerformance(ex.exerciseId);
          return prevExercise?.notes || "";
        });
        setPreviousNotes(prevNotes);

        // Clear the saved state after restoring
        sessionStorage.removeItem(savedStateKey);
        return;
      } catch (e) {
        console.error("Error restoring workout state:", e);
      }
    }

    const init: WorkoutExercise[] = dayPlan.exercises.map((pe) => {
      const prevExercise = getLastPerformance(pe.exerciseId);
      const prevSets = prevExercise?.sets;
      const prevUnit = prevExercise?.unit || settings.defaultUnit;

      const sets: WorkoutSet[] = Array.from({ length: pe.sets }, (_, i) => ({
        setNumber: i + 1,
        previous: prevSets?.[i]
          ? { weight: prevSets[i].weight, reps: prevSets[i].reps }
          : undefined,
        weight: prevSets?.[i]?.weight ?? 0,
        reps: prevSets?.[i]?.reps ?? pe.reps,
        completed: false,
      }));
      return {
        exerciseId: pe.exerciseId,
        sets,
        unit: prevUnit, // Use unit from last performance, or default if new
        notes: "", // Initialize empty notes
      };
    });
    setExercises(init);

    // Initialize rest times and previous notes for each exercise
    const restTimes = dayPlan.exercises.map(
      (pe) => pe.restTime ?? settings.defaultRestTime * 60,
    );
    setExerciseRestTimes(restTimes);

    const prevNotes = dayPlan.exercises.map((pe) => {
      const prevExercise = getLastPerformance(pe.exerciseId);
      return prevExercise?.notes || "";
    });
    setPreviousNotes(prevNotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle exercises added from ExerciseLibrary
  useEffect(() => {
    const state = location.state as { addExercises?: string[] } | null;
    if (state?.addExercises && state.addExercises.length > 0) {
      // Get existing exercise IDs
      const existingExerciseIds = new Set(exercises.map((ex) => ex.exerciseId));

      // Filter out exercises that already exist
      const exercisesToAdd = state.addExercises.filter(
        (exerciseId) => !existingExerciseIds.has(exerciseId),
      );

      // Show warning if some exercises were already in the workout
      if (exercisesToAdd.length < state.addExercises.length) {
        const duplicateCount =
          state.addExercises.length - exercisesToAdd.length;
        toast.error(
          duplicateCount === 1
            ? "Este ejercicio ya está en el entrenamiento"
            : `${duplicateCount} ejercicio(s) ya están en el entrenamiento`,
        );
      }

      // Only add new exercises
      if (exercisesToAdd.length > 0) {
        const newExercises: WorkoutExercise[] = exercisesToAdd.map(
          (exerciseId) => {
            const prevExercise = getLastPerformance(exerciseId);
            const prevSets = prevExercise?.sets;
            const prevUnit = prevExercise?.unit || settings.defaultUnit;

            const sets: WorkoutSet[] = Array.from(
              { length: settings.defaultSets },
              (_, i) => ({
                setNumber: i + 1,
                previous: prevSets?.[i]
                  ? { weight: prevSets[i].weight, reps: prevSets[i].reps }
                  : undefined,
                weight: prevSets?.[i]?.weight ?? 0,
                reps: prevSets?.[i]?.reps ?? 10,
                completed: false,
              }),
            );
            return {
              exerciseId,
              sets,
              unit: prevUnit, // Use unit from last performance, or default if new
              notes: "", // Initialize empty notes
            };
          },
        );

        setExercises((prev) => [...prev, ...newExercises]);

        // Add default rest times and previous notes for new exercises
        setExerciseRestTimes((prev) => [
          ...prev,
          ...new Array(newExercises.length).fill(settings.defaultRestTime * 60),
        ]);

        const newPrevNotes = exercisesToAdd.map((exerciseId) => {
          const prevExercise = getLastPerformance(exerciseId);
          return prevExercise?.notes || "";
        });
        setPreviousNotes((prev) => [...prev, ...newPrevNotes]);
      }

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
    settings.defaultUnit,
    exercises,
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
          // Schedule sound and toast outside updater
          setTimeout(() => {
            playRestTimer();
            toast.success("¡Descanso terminado!", {
              duration: 3000,
              style: {
                fontSize: "16px",
                fontWeight: "600",
              },
            });
          }, 0);
          return null;
        }

        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimer, playRestTimer]);

  const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0);
  const completedSets = exercises.reduce(
    (s, e) => s + e.sets.filter((s) => s.completed).length,
    0,
  );

  const updateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof WorkoutSet,
    value: string | number | boolean,
  ) => {
    setExercises((prev) => {
      const newExercises = prev.map((ex, ei) =>
        ei === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si === setIdx ? { ...s, [field]: value } : s,
              ),
            }
          : ex,
      );

      // Handle completion/uncompletion of sets
      if (field === "completed") {
        if (value === false) {
          const wasWeightRecord =
            newExercises[exIdx].sets[setIdx].recordType === "weight";
          // Clear record type when uncompleting
          newExercises[exIdx].sets[setIdx].recordType = undefined;

          // Recalculate session max for this exercise after uncompleting
          const exercise = newExercises[exIdx];
          const completedSets = exercise.sets.filter((s) => s.completed);
          if (completedSets.length > 0) {
            const newSessionMax = Math.max(
              ...completedSets.map((s) => s.weight),
            );
            setSessionMaxWeight((prev) => ({
              ...prev,
              [exercise.exerciseId]: newSessionMax,
            }));

            // If we removed a weight record, check if another set should now have it
            if (wasWeightRecord) {
              const exerciseUnit = exercise.unit || settings.defaultUnit;
              const historicMaxWeight = getPersonalRecord(
                exercise.exerciseId,
                exerciseUnit,
              );

              // Find the set with the new session max that beats the historic record
              exercise.sets.forEach((s, idx) => {
                if (
                  s.completed &&
                  s.weight === newSessionMax &&
                  s.weight > historicMaxWeight
                ) {
                  newExercises[exIdx].sets[idx].recordType = "weight";
                }
              });
            }
          } else {
            // No completed sets left, remove from sessionMax
            setSessionMaxWeight((prev) => {
              const updated = { ...prev };
              delete updated[exercise.exerciseId];
              return updated;
            });
          }
        } else if (value === true) {
          // Clear any previous record type before evaluating
          newExercises[exIdx].sets[setIdx].recordType = undefined;

          const exercise = newExercises[exIdx];
          const set = exercise.sets[setIdx];
          const exerciseUnit = exercise.unit || settings.defaultUnit;
          const exerciseName =
            exerciseMap[exercise.exerciseId]?.name || "Ejercicio";

          const historicMaxWeight = getPersonalRecord(
            exercise.exerciseId,
            exerciseUnit,
          );
          const historicMaxRepsAtWeight = getMaxRepsAtWeight(
            exercise.exerciseId,
            set.weight,
            exerciseUnit,
          );
          const sessionMax = sessionMaxWeight[exercise.exerciseId] ?? 0;

          const isWeightRecord = set.weight > historicMaxWeight;
          const isVolumeRecord =
            set.weight <= historicMaxWeight &&
            set.weight > 0 &&
            set.reps > historicMaxRepsAtWeight;
          const isNewSessionMax = set.weight > sessionMax;

          // Weight record: new max weight lifted (only show for the heaviest in session)
          if (isWeightRecord && isNewSessionMax) {
            // Clear any previous weight records for this exercise
            newExercises[exIdx].sets.forEach((s, idx) => {
              if (s.recordType === "weight" && idx !== setIdx) {
                newExercises[exIdx].sets[idx].recordType = undefined;
              }
            });

            // Mark this set as a weight record
            newExercises[exIdx].sets[setIdx].recordType = "weight";

            toast.success("¡Nuevo récord de peso!", {
              description: `${exerciseName}: ${set.weight} ${exerciseUnit} × ${set.reps} reps`,
              duration: 5000,
              icon: <Trophy className="w-5 h-5" />,
            });

            // Play achievement sound
            playAchievement();

            // Update session max
            setSessionMaxWeight((prev) => ({
              ...prev,
              [exercise.exerciseId]: set.weight,
            }));
          }
          // Volume record: more reps at a weight previously lifted
          else if (isVolumeRecord) {
            // Mark this set as a volume record
            newExercises[exIdx].sets[setIdx].recordType = "volume";

            const volumeIncrease =
              (set.reps - historicMaxRepsAtWeight) * set.weight;
            toast.success("¡Nuevo récord de volumen!", {
              description: `${exerciseName}: ${set.weight} ${exerciseUnit} × ${set.reps} reps (+${volumeIncrease} ${exerciseUnit})`,
              duration: 5000,
              icon: <Trophy className="w-5 h-5" />,
            });

            // Play achievement sound
            playAchievement();
          }
        }
      }

      // If weight or reps change on a completed set, clear recordType and recalculate sessionMax
      if (
        (field === "weight" || field === "reps") &&
        newExercises[exIdx].sets[setIdx].completed
      ) {
        const hadWeightRecord =
          newExercises[exIdx].sets[setIdx].recordType === "weight";
        newExercises[exIdx].sets[setIdx].recordType = undefined;

        // If this set had a weight record, recalculate session max
        if (hadWeightRecord) {
          const exercise = newExercises[exIdx];
          const completedSets = exercise.sets.filter((s) => s.completed);
          if (completedSets.length > 0) {
            const newSessionMax = Math.max(
              ...completedSets.map((s) => s.weight),
            );
            setSessionMaxWeight((prev) => ({
              ...prev,
              [exercise.exerciseId]: newSessionMax,
            }));
          }
        }
      }

      return newExercises;
    });

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

  const formatRestTime = (seconds: number): string => {
    if (seconds === 0) return "Sin descanso";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}min`;
    return `${mins}min ${secs}s`;
  };

  const toggleExerciseUnit = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;

        const currentUnit = ex.unit || settings.defaultUnit;
        const newUnit: "kg" | "lbs" = currentUnit === "kg" ? "lbs" : "kg";

        // Convert all weights in this exercise
        const convertedSets = ex.sets.map((set) => ({
          ...set,
          weight: convertWeight(set.weight, currentUnit, newUnit),
          previous: set.previous
            ? {
                ...set.previous,
                weight: convertWeight(
                  set.previous.weight,
                  currentUnit,
                  newUnit,
                ),
              }
            : undefined,
        }));

        return {
          ...ex,
          sets: convertedSets,
          unit: newUnit,
        };
      }),
    );
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
    setPreviousNotes((prev) => prev.filter((_, i) => i !== exIdx));

    // Cancel rest timer if it's active for this exercise
    if (restTimer?.exIdx === exIdx) {
      setRestTimer(null);
    }
  };

  const updateNotes = (exIdx: number, notes: string) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === exIdx ? { ...ex, notes } : ex)),
    );
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
    // If there are no structural changes, indices should match directly
    const updatedExercises: PlannedExercise[] = originalPlan.map(
      (original, idx) => ({
        ...original,
        restTime: exerciseRestTimes[idx] ?? original.restTime,
      }),
    );

    updateDayExercises(day as DayName, updatedExercises);
  };

  const handleFinishClick = () => {
    // Check if at least one set is completed
    const hasCompletedSets = exercises.some((ex) =>
      ex.sets.some((s) => s.completed),
    );

    if (!hasCompletedSets) {
      toast.error(
        "Completa al menos una serie para finalizar el entrenamiento",
      );
      return;
    }

    // Si la opción de confirmar al finalizar está activada, mostrar el diálogo
    if (settings.confirmOnFinish) {
      setShowFinishDialog(true);
    } else {
      // Si no, finalizar directamente, pero respetar el flujo de cambios estructurales
      // Replicar la lógica de handleFinish aquí, pero sin mostrar el diálogo simple
      const workout = {
        id: `w-${Date.now()}`,
        day: day as DayName,
        label: dayPlan?.label,
        date: new Date().toISOString(),
        durationSeconds: elapsed,
        exercises,
      };

      if (hasStructuralChanges()) {
        setPendingWorkout(workout);
        setShowChangesDialog(true);
      } else {
        applyRestTimesOnly();
        addWorkout(workout);
        setTimeout(() => {
          navigate(`/summary/${workout.id}`, { state: workout });
        }, 0);
      }
    }
  };

  const handleFinish = () => {
    setShowFinishDialog(false);
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

      // Wait a tick to ensure localStorage is updated before navigating
      setTimeout(() => {
        navigate(`/summary/${workout.id}`, { state: workout });
      }, 0);
    }
  };

  const handleApplyChanges = () => {
    applyChangesToPlan();
    if (pendingWorkout) {
      addWorkout(pendingWorkout);
      // Wait a tick to ensure localStorage is updated before navigating
      setTimeout(() => {
        navigate(`/summary/${pendingWorkout.id}`, { state: pendingWorkout });
      }, 0);
    }
  };

  const handleDiscardChanges = () => {
    // Save only rest times for original exercises
    applyRestTimesOnly();
    if (pendingWorkout) {
      addWorkout(pendingWorkout);
      // Wait a tick to ensure localStorage is updated before navigating
      setTimeout(() => {
        navigate(`/summary/${pendingWorkout.id}`, { state: pendingWorkout });
      }, 0);
    }
  };

  const handleExitClick = () => {
    setShowExitDialog(true);
  };

  const handleConfirmExit = () => {
    // Don't save anything when discarding
    setShowExitDialog(false);
    navigate("/");
  };

  const handleSaveAndExit = () => {
    // Check if at least one set is completed
    const hasCompletedSets = exercises.some((ex) =>
      ex.sets.some((s) => s.completed),
    );

    if (!hasCompletedSets) {
      toast.error(
        "Debes completar al menos una serie para guardar el entrenamiento",
      );
      setShowExitDialog(false);
      return;
    }

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

    // Wait a tick to ensure localStorage is updated before navigating
    setTimeout(() => {
      navigate(`/summary/${workout.id}`, { state: workout });
    }, 0);
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
        <div
          className="flex items-center justify-between mb-4"
          data-tour="workout-header"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExitClick}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-lg font-bold flex items-center min-w-0">
                <span className="flex-shrink-0">{day}</span>
                {dayPlan?.label && (
                  <span className="text-primary truncate ml-1">
                    {" "}
                    - {dayPlan.label}
                  </span>
                )}
              </h1>
              <p className="text-sm sm:text-xs text-muted-foreground">
                {formatTime(elapsed)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={startTour}
              title="Ver tutorial"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              onClick={handleFinishClick}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              data-tour="finish-btn"
            >
              <Check className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <motion.div
          data-tour="workout-progress"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="flex justify-between text-sm sm:text-xs text-muted-foreground mb-1">
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
                  <Card
                    className="p-4"
                    onClick={() => setRevealedSet(null)}
                    id={exIdx === 0 ? "tour-exercise-card-0" : undefined}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-16 h-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailExercise(data);
                          setDetailSheetOpen(true);
                        }}
                      >
                        {data?.imageUrl ? (
                          <img
                            src={data.imageUrl}
                            alt={data.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            IMG
                          </span>
                        )}
                      </div>
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailExercise(data);
                          setDetailSheetOpen(true);
                        }}
                      >
                        <p className="text-base sm:text-sm font-semibold hover:text-primary transition-colors">
                          {data.name}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-xs sm:text-[10px]"
                        >
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
                    <div
                      className="flex items-center gap-2 mb-3"
                      id={exIdx === 0 ? "tour-rest-time-0" : undefined}
                    >
                      <Timer className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm sm:text-xs text-muted-foreground">
                        Descanso:
                      </span>
                      <Select
                        value={String(exerciseRestTimes[exIdx] || 0)}
                        onValueChange={(value) =>
                          updateRestTime(exIdx, Number(value))
                        }
                      >
                        <SelectTrigger className="h-auto w-auto border-0 bg-transparent px-0 py-0 text-sm sm:text-xs font-medium hover:text-primary transition-colors focus:ring-0 focus:ring-offset-0 gap-1">
                          <SelectValue>
                            {formatRestTime(exerciseRestTimes[exIdx] || 0)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sin descanso</SelectItem>
                          <SelectItem value="30">30s</SelectItem>
                          <SelectItem value="60">1min</SelectItem>
                          <SelectItem value="90">1min 30s</SelectItem>
                          <SelectItem value="120">2min</SelectItem>
                          <SelectItem value="150">2min 30s</SelectItem>
                          <SelectItem value="180">3min</SelectItem>
                          <SelectItem value="210">3min 30s</SelectItem>
                          <SelectItem value="240">4min</SelectItem>
                          <SelectItem value="300">5min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes section */}
                    <div className="mb-3">
                      <Textarea
                        placeholder={
                          previousNotes[exIdx]
                            ? previousNotes[exIdx]
                            : "Agregar notas..."
                        }
                        value={ex.notes || ""}
                        onChange={(e) => updateNotes(exIdx, e.target.value)}
                        className="text-sm sm:text-xs min-h-[60px] resize-none rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Sets table */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-[2.5rem_4.5rem_1fr_4rem_2.5rem] gap-1 text-sm sm:text-xs font-semibold text-muted-foreground px-1">
                        <span className="text-center">Serie</span>
                        <span className="text-center">Previo</span>
                        <span
                          className="text-center cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setUnitChangeDialogExIdx(exIdx)}
                          id={exIdx === 0 ? "tour-weight-unit-0" : undefined}
                        >
                          Peso ({ex.unit || settings.defaultUnit})
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
                              className="relative h-9 sm:h-8 rounded overflow-hidden"
                              id={
                                exIdx === 0 && setIdx === 0
                                  ? "tour-set-row-0"
                                  : undefined
                              }
                            >
                              {/* Background red for delete */}
                              {ex.sets.length > 1 && (
                                <div className="absolute inset-0 bg-destructive flex items-center justify-end pr-2 rounded-xl">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 sm:h-7 px-3 text-destructive-foreground hover:bg-destructive-foreground/20"
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
                                className="absolute inset-0 grid grid-cols-[2.5rem_4.5rem_1fr_4rem_2.5rem] gap-1 items-center px-1 bg-card touch-draggable"
                                style={{ touchAction: "pan-y" }}
                                initial={{ opacity: 1, x: 0 }}
                                exit={{
                                  opacity: 0,
                                  y: -10,
                                  transition: { duration: 0.15 },
                                }}
                              >
                                <span className="text-sm sm:text-xs text-center pointer-events-none">
                                  {set.setNumber}
                                </span>
                                <span className="text-sm sm:text-xs text-muted-foreground text-center pointer-events-none">
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
                                    className="h-9 sm:h-8 text-sm sm:text-xs text-center px-1"
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
                                    className="h-9 sm:h-8 text-sm sm:text-xs text-center px-1"
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
                                    id={
                                      exIdx === 0 && setIdx === 0
                                        ? "tour-set-checkbox-0"
                                        : undefined
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
                      className="mt-2 text-sm sm:text-xs w-full border border-border"
                      id={exIdx === 0 ? "tour-add-set-0" : undefined}
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
          className="w-full mt-4 text-sm"
          data-tour="add-exercise-btn"
          onClick={() => {
            setRevealedSet(null);
            // Save current state to sessionStorage before navigating
            const savedStateKey = `activeWorkout_${day}`;
            sessionStorage.setItem(
              savedStateKey,
              JSON.stringify({
                exercises,
                restTimes: exerciseRestTimes,
              }),
            );
            navigate(`/exercises?fromWorkout=${day}`, {
              state: {
                startTime,
                currentExercises: exercises.map((ex) => ex.exerciseId),
              },
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

      {/* Finish confirmation dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar entrenamiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu progreso será guardado y podrás ver el resumen del
              entrenamiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinish}>
              Finalizar
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

      {/* Unit Change Dialog */}
      <Dialog
        open={unitChangeDialogExIdx !== null}
        onOpenChange={(open) => !open && setUnitChangeDialogExIdx(null)}
      >
        <DialogContent className="max-w-sm w-[calc(100%-2rem)] rounded-xl">
          <DialogHeader>
            <DialogTitle>Cambiar unidad de peso</DialogTitle>
            <DialogDescription>
              {unitChangeDialogExIdx !== null && (
                <>
                  Selecciona la unidad que deseas usar para{" "}
                  <strong>
                    {exerciseMap[exercises[unitChangeDialogExIdx]?.exerciseId]
                      ?.name || "este ejercicio"}
                  </strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {unitChangeDialogExIdx !== null && (
            <div className="flex gap-3 py-2">
              <Button
                variant={
                  exercises[unitChangeDialogExIdx]?.unit === "kg"
                    ? "default"
                    : "outline"
                }
                className="flex-1 h-20"
                onClick={() => {
                  if (exercises[unitChangeDialogExIdx]?.unit !== "kg") {
                    toggleExerciseUnit(unitChangeDialogExIdx);
                  }
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold">kg</span>
                  <span className="text-xs opacity-80">Kilogramos</span>
                </div>
              </Button>
              <Button
                variant={
                  exercises[unitChangeDialogExIdx]?.unit === "lbs" ||
                  !exercises[unitChangeDialogExIdx]?.unit
                    ? "default"
                    : "outline"
                }
                className="flex-1 h-20"
                onClick={() => {
                  if (
                    exercises[unitChangeDialogExIdx]?.unit !== "lbs" &&
                    exercises[unitChangeDialogExIdx]?.unit !== undefined
                  ) {
                    toggleExerciseUnit(unitChangeDialogExIdx);
                  }
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold">lbs</span>
                  <span className="text-xs opacity-80">Libras</span>
                </div>
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setUnitChangeDialogExIdx(null)}
              className="w-full"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed Rest Timer at Bottom */}
      <AnimatePresence>
        {restTimer && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
          >
            <div className="max-w-2xl mx-auto px-4 pb-8 pointer-events-auto">
              <Card className="p-3 glass">
                <div className="flex items-center justify-between gap-2">
                  {/* Timer display */}
                  <div className="flex items-center gap-2">
                    <Timer className="w-6 sm:w-5 h-6 sm:h-5 text-primary flex-shrink-0 dark:text-white" />
                    <div className="text-4xl sm:text-3xl font-bold tabular-nums text-primary dark:text-white">
                      {Math.floor(restTimer.timeLeft / 60)}:
                      {String(restTimer.timeLeft % 60).padStart(2, "0")}
                    </div>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        unlock();
                        adjustRestTimer(-15);
                      }}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        unlock();
                        adjustRestTimer(15);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        unlock();
                        toggleRestTimer();
                      }}
                    >
                      {restTimer.isPaused ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        unlock();
                        cancelRestTimer();
                      }}
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

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        exercise={detailExercise}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </motion.div>
  );
}
