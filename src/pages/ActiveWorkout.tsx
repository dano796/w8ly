import { useState, useEffect, useRef } from "react";
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
  GripVertical,
  ArrowUpDown,
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

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

type PersistedRestTimer = {
  exIdx: number;
  timeLeft: number;
  isPaused: boolean;
  targetEndTime?: number | null;
};

type PersistedWorkoutState = {
  startTime: number;
  exercises: WorkoutExercise[];
  restTimes: number[];
  restTimer: PersistedRestTimer | null;
};

// ─── Sortable Exercise Card ───────────────────────────────────────────────────

interface SortableExerciseCardProps {
  id: string;
  ex: WorkoutExercise;
  exIdx: number;
  isSortMode: boolean;
  justDropped: boolean;
  // all the props the card needs when NOT in sort mode
  children: React.ReactNode;
  exerciseMap: Record<string, Exercise>;
  onLongPress: (exIdx: number) => void;
}

function SortableExerciseCard({
  id,
  ex,
  exIdx,
  isSortMode,
  justDropped,
  children,
  exerciseMap,
  onLongPress,
}: SortableExerciseCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    transition: {
      duration: 320,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    // Hide the original slot completely while dragging — overlay handles the visual
    opacity: isDragging ? 0 : 1,
    touchAction: "none",
  };

  const data = exerciseMap[ex.exerciseId];
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const handlePointerDown = () => {
    if (isSortMode) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress(exIdx);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerCancel = handlePointerUp;

  if (isSortMode) {
    // Compact sort-mode card — motion.div wraps for layout animation
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        layout
        layoutId={`sort-card-${id}`}
        animate={justDropped ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={
          justDropped
            ? { duration: 0.35, ease: [0.25, 1, 0.5, 1] }
            : { type: "spring", stiffness: 500, damping: 40 }
        }
      >
        <Card
          className="p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing select-none touch-none"
          {...attributes}
          {...listeners}
        >
          <div className="flex flex-col items-center flex-shrink-0 w-6 gap-0.5">
            <GripVertical className="w-5 h-5 text-primary" />
          </div>
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {data?.imageUrl ? (
              <img
                src={data.imageUrl}
                alt={data?.name}
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />
            ) : (
              <span className="text-xs text-muted-foreground">IMG</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-sm font-semibold truncate">
              {data?.name}
            </p>
            <Badge
              variant="secondary"
              className="text-xs sm:text-[10px] mt-0.5"
            >
              {data?.muscleGroup}
            </Badge>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Normal mode card
  return (
    <div
      ref={setNodeRef}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

// ─── Drag Overlay Card (ghost while dragging) ─────────────────────────────────

function DragOverlayCard({
  ex,
  exerciseMap,
}: {
  ex: WorkoutExercise;
  exerciseMap: Record<string, Exercise>;
}) {
  const data = exerciseMap[ex.exerciseId];
  return (
    <motion.div
      initial={{ scale: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
      animate={{ scale: 1.03, boxShadow: "0 16px 40px rgba(0,0,0,0.22)" }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <Card className="p-3 flex items-center gap-3 select-none ring-2 ring-primary/40 bg-card">
        <GripVertical className="w-5 h-5 text-primary flex-shrink-0" />
        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {data?.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={data?.name}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <span className="text-xs text-muted-foreground">IMG</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-sm font-semibold truncate">
            {data?.name}
          </p>
          <Badge variant="secondary" className="text-xs sm:text-[10px] mt-0.5">
            {data?.muscleGroup}
          </Badge>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  const { playRestTimer, playAchievement, unlock } = useWorkoutSounds();

  const allExercises = [...defaultExercises, ...customExercises];
  const exerciseMap = Object.fromEntries(allExercises.map((e) => [e.id, e]));

  const dayPlan = plan.find((d) => d.day === day);
  const workoutStateKey = `activeWorkout_${day}`;
  const restTimerTargetRef = useRef<number | null>(null);
  const hasHydratedStateRef = useRef(false);

  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [originalPlan, setOriginalPlan] = useState<PlannedExercise[]>([]);
  const [startTime, setStartTime] = useState(() => {
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

  const [sessionMaxWeight, setSessionMaxWeight] = useState<
    Record<string, number>
  >({});

  const [restTimer, setRestTimer] = useState<{
    exIdx: number;
    timeLeft: number;
    isPaused: boolean;
  } | null>(null);
  const [exerciseRestTimes, setExerciseRestTimes] = useState<number[]>([]);
  const [previousNotes, setPreviousNotes] = useState<string[]>([]);

  // ── Sort mode state ──
  const [isSortMode, setIsSortMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Tracks the sortable ID that was just dropped so we can play a landing animation
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);

  const { startTour } = useWorkoutTour({ ready: exercises.length > 0 });

  // dnd-kit sensors — pointer with a distance constraint so taps still work
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 0, tolerance: 5 },
    }),
  );

  // Ref to the node that received the drop — read after state update for correct position
  const dropTargetNodeRef = useRef<HTMLElement | null>(null);

  // Stable IDs for dnd-kit — use exerciseId directly (duplicates are prevented on add)
  const sortableIds = exercises.map((ex) => ex.exerciseId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setJustDroppedId(null);
    dropTargetNodeRef.current = null;
  };

  // Reorder live as the dragged card passes over others → items make room in real time
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortableIds.indexOf(String(active.id));
    const newIndex = sortableIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    setExercises((prev) => arrayMove(prev, oldIndex, newIndex));
    setExerciseRestTimes((prev) => arrayMove(prev, oldIndex, newIndex));
    setPreviousNotes((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    // Reorder already happened live in handleDragOver — just trigger the landing animation
    setJustDroppedId(String(active.id));
    setTimeout(() => setJustDroppedId(null), 420);

    // setActiveId(null) is called inside the custom dropAnimation below
  };

  // Custom dropAnimation: wait one rAF so the DOM has moved to its final position,
  // then animate the overlay from current pos → target node's new bounding rect.
  const customDropAnimation = {
    duration: 300,
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    keyframes({
      transform,
      id,
      activeNodeRect,
      draggableNodes,
      droppableContainers,
      measuredDraggingNodeRect,
    }: any) {
      // Find the node that now holds the dragged item (it moved after state update)
      const draggableNode = draggableNodes.get(id);
      const node = draggableNode?.node?.current as HTMLElement | undefined;
      if (!node || !measuredDraggingNodeRect) return [{}];

      // Measure where it currently is in the DOM (post-reorder)
      const finalRect = node.getBoundingClientRect();

      const deltaX = finalRect.left - measuredDraggingNodeRect.left;
      const deltaY = finalRect.top - measuredDraggingNodeRect.top;

      return [
        { transform: CSS.Transform.toString(transform.initial) },
        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
      ];
    },
    sideEffects({ active }: any) {
      // Once the drop animation completes, clear the active id
      return () => {
        setActiveId(null);
      };
    },
  };

  const handleLongPress = (exIdx: number) => {
    setIsSortMode(true);
    setRevealedSet(null);
  };

  const exitSortMode = () => setIsSortMode(false);

  // ── Init exercises ──
  useEffect(() => {
    if (!dayPlan) return;
    setOriginalPlan(JSON.parse(JSON.stringify(dayPlan.exercises)));

    const savedState =
      localStorage.getItem(workoutStateKey) ||
      sessionStorage.getItem(workoutStateKey);

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState) as PersistedWorkoutState;
        if (typeof parsed.startTime === "number") {
          setStartTime(parsed.startTime);
          setElapsed(Math.floor((Date.now() - parsed.startTime) / 1000));
        }
        setExercises(parsed.exercises || []);
        setExerciseRestTimes(parsed.restTimes || []);
        if (parsed.restTimer) {
          if (!parsed.restTimer.isPaused && parsed.restTimer.targetEndTime) {
            const nextTimeLeft = Math.max(
              0,
              Math.ceil((parsed.restTimer.targetEndTime - Date.now()) / 1000),
            );
            if (nextTimeLeft > 0) {
              setRestTimer({
                exIdx: parsed.restTimer.exIdx,
                timeLeft: nextTimeLeft,
                isPaused: false,
              });
              restTimerTargetRef.current = parsed.restTimer.targetEndTime;
            } else {
              setRestTimer(null);
              restTimerTargetRef.current = null;
            }
          } else {
            setRestTimer({
              exIdx: parsed.restTimer.exIdx,
              timeLeft: parsed.restTimer.timeLeft,
              isPaused: true,
            });
            restTimerTargetRef.current = null;
          }
        }
        const prevNotes = (parsed.exercises || []).map(
          (ex: WorkoutExercise) => {
            const prevExercise = getLastPerformance(ex.exerciseId);
            return prevExercise?.notes || "";
          },
        );
        setPreviousNotes(prevNotes);
        hasHydratedStateRef.current = true;
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
      return { exerciseId: pe.exerciseId, sets, unit: prevUnit, notes: "" };
    });
    setExercises(init);

    const restTimes = dayPlan.exercises.map(
      (pe) => pe.restTime ?? settings.defaultRestTime * 60,
    );
    setExerciseRestTimes(restTimes);

    const prevNotes = dayPlan.exercises.map((pe) => {
      const prevExercise = getLastPerformance(pe.exerciseId);
      return prevExercise?.notes || "";
    });
    setPreviousNotes(prevNotes);
    hasHydratedStateRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle exercises added from ExerciseLibrary
  useEffect(() => {
    const state = location.state as { addExercises?: string[] } | null;
    if (state?.addExercises && state.addExercises.length > 0) {
      const existingExerciseIds = new Set(exercises.map((ex) => ex.exerciseId));
      const exercisesToAdd = state.addExercises.filter(
        (exerciseId) => !existingExerciseIds.has(exerciseId),
      );

      if (exercisesToAdd.length < state.addExercises.length) {
        const duplicateCount =
          state.addExercises.length - exercisesToAdd.length;
        toast.error(
          duplicateCount === 1
            ? "Este ejercicio ya está en el entrenamiento"
            : `${duplicateCount} ejercicio(s) ya están en el entrenamiento`,
        );
      }

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
            return { exerciseId, sets, unit: prevUnit, notes: "" };
          },
        );

        setExercises((prev) => [...prev, ...newExercises]);
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
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
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
        if (restTimerTargetRef.current) {
          const nextTimeLeft = Math.max(
            0,
            Math.ceil((restTimerTargetRef.current - Date.now()) / 1000),
          );
          if (nextTimeLeft <= 0) {
            restTimerTargetRef.current = null;
            setTimeout(() => {
              playRestTimer();
              toast.success("¡Descanso terminado!", {
                duration: 3000,
                style: { fontSize: "16px", fontWeight: "600" },
              });
            }, 0);
            return null;
          }
          return { ...prev, timeLeft: nextTimeLeft };
        }
        if (prev.timeLeft <= 1) {
          restTimerTargetRef.current = null;
          setTimeout(() => {
            playRestTimer();
            toast.success("¡Descanso terminado!", {
              duration: 3000,
              style: { fontSize: "16px", fontWeight: "600" },
            });
          }, 0);
          return null;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer, playRestTimer]);

  // Persist state
  useEffect(() => {
    if (!day || !hasHydratedStateRef.current) return;
    const payload: PersistedWorkoutState = {
      startTime,
      exercises,
      restTimes: exerciseRestTimes,
      restTimer: restTimer
        ? {
            ...restTimer,
            targetEndTime: restTimer.isPaused
              ? null
              : restTimerTargetRef.current,
          }
        : null,
    };
    const serialized = JSON.stringify(payload);
    localStorage.setItem(workoutStateKey, serialized);
    sessionStorage.setItem(workoutStateKey, serialized);
  }, [
    day,
    startTime,
    exercises,
    exerciseRestTimes,
    restTimer,
    workoutStateKey,
  ]);

  const clearPersistedWorkoutState = () => {
    localStorage.removeItem(workoutStateKey);
    sessionStorage.removeItem(workoutStateKey);
  };

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

      if (field === "completed") {
        if (value === false) {
          const wasWeightRecord =
            newExercises[exIdx].sets[setIdx].recordType === "weight";
          newExercises[exIdx].sets[setIdx].recordType = undefined;
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
            if (wasWeightRecord) {
              const exerciseUnit = exercise.unit || settings.defaultUnit;
              const historicMaxWeight = getPersonalRecord(
                exercise.exerciseId,
                exerciseUnit,
              );
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
            setSessionMaxWeight((prev) => {
              const updated = { ...prev };
              delete updated[exercise.exerciseId];
              return updated;
            });
          }
        } else if (value === true) {
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

          if (isWeightRecord && isNewSessionMax) {
            newExercises[exIdx].sets.forEach((s, idx) => {
              if (s.recordType === "weight" && idx !== setIdx)
                newExercises[exIdx].sets[idx].recordType = undefined;
            });
            newExercises[exIdx].sets[setIdx].recordType = "weight";
            toast.success("¡Nuevo récord de peso!", {
              description: `${exerciseName}: ${set.weight} ${exerciseUnit} × ${set.reps} reps`,
              duration: 5000,
              icon: <Trophy className="w-5 h-5" />,
            });
            playAchievement();
            setSessionMaxWeight((prev) => ({
              ...prev,
              [exercise.exerciseId]: set.weight,
            }));
          } else if (isVolumeRecord) {
            newExercises[exIdx].sets[setIdx].recordType = "volume";
            const volumeIncrease =
              (set.reps - historicMaxRepsAtWeight) * set.weight;
            toast.success("¡Nuevo récord de volumen!", {
              description: `${exerciseName}: ${set.weight} ${exerciseUnit} × ${set.reps} reps (+${volumeIncrease} ${exerciseUnit})`,
              duration: 5000,
              icon: <Trophy className="w-5 h-5" />,
            });
            playAchievement();
          }
        }
      }

      if (
        (field === "weight" || field === "reps") &&
        newExercises[exIdx].sets[setIdx].completed
      ) {
        const hadWeightRecord =
          newExercises[exIdx].sets[setIdx].recordType === "weight";
        newExercises[exIdx].sets[setIdx].recordType = undefined;
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

    if (field === "completed" && value === true) startRestTimer(exIdx);
  };

  const startRestTimer = (exIdx: number) => {
    const restTime = exerciseRestTimes[exIdx] ?? settings.defaultRestTime * 60;
    if (restTime === 0) return;
    restTimerTargetRef.current = Date.now() + restTime * 1000;
    setRestTimer({ exIdx, timeLeft: restTime, isPaused: false });
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
        return { ...ex, sets: convertedSets, unit: newUnit };
      }),
    );
  };

  const toggleRestTimer = () => {
    if (restTimer) {
      const nextPaused = !restTimer.isPaused;
      restTimerTargetRef.current = nextPaused
        ? null
        : Date.now() + restTimer.timeLeft * 1000;
      setRestTimer({ ...restTimer, isPaused: nextPaused });
    }
  };

  const cancelRestTimer = () => {
    restTimerTargetRef.current = null;
    setRestTimer(null);
  };

  const adjustRestTimer = (seconds: number) => {
    if (restTimer) {
      const nextTimeLeft = Math.max(0, restTimer.timeLeft + seconds);
      if (!restTimer.isPaused)
        restTimerTargetRef.current = Date.now() + nextTimeLeft * 1000;
      setRestTimer({ ...restTimer, timeLeft: nextTimeLeft });
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
    if (restTimer?.exIdx === exIdx) {
      restTimerTargetRef.current = null;
      setRestTimer(null);
    }
  };

  const updateNotes = (exIdx: number, notes: string) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === exIdx ? { ...ex, notes } : ex)),
    );
  };

  const hasStructuralChanges = () => {
    if (exercises.length !== originalPlan.length) return true;
    for (let i = 0; i < exercises.length; i++) {
      if (exercises[i].exerciseId !== originalPlan[i].exerciseId) return true;
      if (exercises[i].sets.length !== originalPlan[i].sets) return true;
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
    const updatedExercises: PlannedExercise[] = originalPlan.map(
      (original, idx) => ({
        ...original,
        restTime: exerciseRestTimes[idx] ?? original.restTime,
      }),
    );
    updateDayExercises(day as DayName, updatedExercises);
  };

  const handleFinishClick = () => {
    const hasCompletedSets = exercises.some((ex) =>
      ex.sets.some((s) => s.completed),
    );
    if (!hasCompletedSets) {
      toast.error(
        "Completa al menos una serie para finalizar el entrenamiento",
      );
      return;
    }
    if (settings.confirmOnFinish) {
      setShowFinishDialog(true);
    } else {
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
        clearPersistedWorkoutState();
        setTimeout(
          () => navigate(`/summary/${workout.id}`, { state: workout }),
          0,
        );
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
    if (hasStructuralChanges()) {
      setPendingWorkout(workout);
      setShowChangesDialog(true);
    } else {
      applyRestTimesOnly();
      addWorkout(workout);
      clearPersistedWorkoutState();
      setTimeout(
        () => navigate(`/summary/${workout.id}`, { state: workout }),
        0,
      );
    }
  };

  const handleApplyChanges = () => {
    applyChangesToPlan();
    if (pendingWorkout) {
      addWorkout(pendingWorkout);
      clearPersistedWorkoutState();
      setTimeout(
        () =>
          navigate(`/summary/${pendingWorkout.id}`, { state: pendingWorkout }),
        0,
      );
    }
  };

  const handleDiscardChanges = () => {
    applyRestTimesOnly();
    if (pendingWorkout) {
      addWorkout(pendingWorkout);
      clearPersistedWorkoutState();
      setTimeout(
        () =>
          navigate(`/summary/${pendingWorkout.id}`, { state: pendingWorkout }),
        0,
      );
    }
  };

  const handleExitClick = () => setShowExitDialog(true);

  const handleConfirmExit = () => {
    clearPersistedWorkoutState();
    setShowExitDialog(false);
    navigate("/");
  };

  const handleSaveAndExit = () => {
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
    if (hasStructuralChanges()) applyChangesToPlan();
    else applyRestTimesOnly();
    addWorkout(workout);
    clearPersistedWorkoutState();
    setShowExitDialog(false);
    setTimeout(() => navigate(`/summary/${workout.id}`, { state: workout }), 0);
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

  // activeId is now just the exerciseId (stable, no index suffix)
  const activeExercise = activeId
    ? exercises.find((ex) => ex.exerciseId === activeId) ?? null
    : null;

  return (
    <motion.div
      className="max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      // Disable text selection globally except in allowed fields
      style={{
        userSelect: isSortMode ? "none" : undefined,
        marginTop: 0,
      }}
    >
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 pt-6 pb-4">
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
            {exercises.length > 1 && (
              <Button
                variant={isSortMode ? "secondary" : "ghost"}
                size="icon"
                onClick={() =>
                  isSortMode
                    ? exitSortMode()
                    : (setIsSortMode(true), setRevealedSet(null))
                }
                title="Reordenar ejercicios"
                data-tour="sort-btn"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            )}
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

      {/* Sort mode banner — floats below header, outside of it */}
      <AnimatePresence>
        <AnimatePresence mode="wait">
          {isSortMode ? (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -48, scale: 0.98 }}
              transition={{
                opacity: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
                y: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
                scale: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
              }}
              className="sticky top-[calc(var(--header-height,88px))] z-10 mx-4 mt-3 mb-0"
            >
              <div className="flex items-center justify-between gap-3 bg-primary text-primary-foreground rounded-xl px-4 py-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center flex-shrink-0 w-6 gap-0.5">
                    <GripVertical className="w-5 h-5 opacity-90" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base font-semibold">
                      Modo reordenación
                    </span>
                    <span className="text-sm opacity-75">
                      Mantén pulsado y arrastra para cambiar el orden
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={exitSortMode}
                  className="w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] rounded-2xl"
                >
                  <Check className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ marginTop: 56, opacity: 1 }}
              animate={{ marginTop: 0, opacity: 0 }}
              transition={{
                marginTop: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
                opacity: { duration: 0.35 },
              }}
            />
          )}
        </AnimatePresence>
      </AnimatePresence>

      {/* Scrollable Content */}
      <div className="px-4 pb-8 pt-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
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
                  const sortableId = sortableIds[exIdx];

                  return (
                    <motion.div
                      key={ex.exerciseId}
                      variants={listItemVariants}
                      exit={{
                        opacity: 0,
                        y: -20,
                        transition: { duration: 0.2 },
                      }}
                      layout
                    >
                      <SortableExerciseCard
                        id={sortableId}
                        ex={ex}
                        exIdx={exIdx}
                        isSortMode={isSortMode}
                        justDropped={justDroppedId === ex.exerciseId}
                        exerciseMap={exerciseMap}
                        onLongPress={handleLongPress}
                      >
                        {/* Full card content — only rendered when NOT in sort mode */}
                        <Card
                          className="p-4"
                          onClick={() => setRevealedSet(null)}
                          id={exIdx === 0 ? "tour-exercise-card-0" : undefined}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
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
                            {/* Long-press target: exercise name */}
                            <div
                              className="flex-1 cursor-pointer select-none"
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
                                  {formatRestTime(
                                    exerciseRestTimes[exIdx] || 0,
                                  )}
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

                          {/* Notes */}
                          <div className="mb-3">
                            <Textarea
                              placeholder={
                                previousNotes[exIdx]
                                  ? previousNotes[exIdx]
                                  : "Agregar notas..."
                              }
                              value={ex.notes || ""}
                              onChange={(e) =>
                                updateNotes(exIdx, e.target.value)
                              }
                              className="text-sm sm:text-xs min-h-[60px] resize-none rounded-xl"
                              onClick={(e) => e.stopPropagation()}
                              // Allow text selection in notes
                              style={{ userSelect: "text" }}
                            />
                          </div>

                          {/* Sets table */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-[2.5rem_4.5rem_1fr_4rem_2.5rem] gap-1 text-sm sm:text-xs font-semibold text-muted-foreground px-1 select-none">
                              <span className="text-center">Serie</span>
                              <span className="text-center">Previo</span>
                              <span
                                className="text-center cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setUnitChangeDialogExIdx(exIdx)}
                                id={
                                  exIdx === 0 ? "tour-weight-unit-0" : undefined
                                }
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
                                          if (info.offset.x < -40)
                                            setRevealedSet(setKey);
                                          else if (info.offset.x > 10)
                                            setRevealedSet(null);
                                        }
                                      }}
                                      onDragStart={() => {
                                        if (
                                          revealedSet &&
                                          revealedSet !== setKey
                                        )
                                          setRevealedSet(null);
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
                                      <span className="text-sm sm:text-xs text-center pointer-events-none select-none">
                                        {set.setNumber}
                                      </span>
                                      <span className="text-sm sm:text-xs text-muted-foreground text-center pointer-events-none select-none">
                                        {set.previous
                                          ? `${set.previous.weight}×${set.previous.reps}`
                                          : "-"}
                                      </span>
                                      <div
                                        onPointerDown={(e) =>
                                          e.stopPropagation()
                                        }
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
                                          style={{ userSelect: "text" }}
                                        />
                                      </div>
                                      <div
                                        onPointerDown={(e) =>
                                          e.stopPropagation()
                                        }
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
                                          style={{ userSelect: "text" }}
                                        />
                                      </div>
                                      <div
                                        className="flex justify-center"
                                        onPointerDown={(e) =>
                                          e.stopPropagation()
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Checkbox
                                          checked={set.completed}
                                          onCheckedChange={(v) =>
                                            updateSet(
                                              exIdx,
                                              setIdx,
                                              "completed",
                                              v,
                                            )
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
                            className="mt-2 text-sm sm:text-xs w-full border border-border select-none"
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
                      </SortableExerciseCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </SortableContext>

          <DragOverlay dropAnimation={customDropAnimation}>
            {activeId && activeExercise ? (
              <DragOverlayCard ex={activeExercise} exerciseMap={exerciseMap} />
            ) : null}
          </DragOverlay>
        </DndContext>

        {!isSortMode && (
          <Button
            variant="outline"
            className="w-full mt-4 text-sm select-none"
            data-tour="add-exercise-btn"
            onClick={() => {
              setRevealedSet(null);
              const snapshot: PersistedWorkoutState = {
                startTime,
                exercises,
                restTimes: exerciseRestTimes,
                restTimer: restTimer
                  ? {
                      ...restTimer,
                      targetEndTime: restTimer.isPaused
                        ? null
                        : restTimerTargetRef.current,
                    }
                  : null,
              };
              const serialized = JSON.stringify(snapshot);
              localStorage.setItem(workoutStateKey, serialized);
              sessionStorage.setItem(workoutStateKey, serialized);
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
        )}
      </div>

      {/* Dialogs */}
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
                  if (exercises[unitChangeDialogExIdx]?.unit !== "kg")
                    toggleExerciseUnit(unitChangeDialogExIdx);
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

      {/* Rest Timer */}
      <AnimatePresence>
        {restTimer && !isSortMode && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
          >
            <div className="max-w-2xl mx-auto px-4 pb-8 pointer-events-auto">
              <Card className="p-3 glass">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-6 sm:w-5 h-6 sm:h-5 text-primary flex-shrink-0 dark:text-white" />
                    <div className="text-4xl sm:text-3xl font-bold tabular-nums text-primary dark:text-white">
                      {Math.floor(restTimer.timeLeft / 60)}:
                      {String(restTimer.timeLeft % 60).padStart(2, "0")}
                    </div>
                  </div>
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

      <ExerciseDetailSheet
        exercise={detailExercise}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </motion.div>
  );
}
