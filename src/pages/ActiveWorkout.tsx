import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useSettings } from "@/hooks/useSettings";
import { defaultExercises } from "@/utils/exerciseData";
import { DayName, WorkoutExercise, WorkoutSet } from "@/utils/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { motion } from "framer-motion";
import {
  pageVariants,
  listContainerVariants,
  listItemVariants,
} from "@/utils/animations";

const exerciseMap = Object.fromEntries(defaultExercises.map((e) => [e.id, e]));

export default function ActiveWorkoutPage() {
  const { day } = useParams<{ day: string }>();
  const navigate = useNavigate();
  const { plan } = useWeeklyPlan();
  const { addWorkout, getLastPerformance } = useWorkoutHistory();
  const { settings } = useSettings();

  const dayPlan = plan.find((d) => d.day === day);

  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Initialize exercises from plan
  useEffect(() => {
    if (!dayPlan) return;
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
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTime) / 1000)),
      1000,
    );
    return () => clearInterval(interval);
  }, [startTime]);

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

  const handleFinish = () => {
    const workout = {
      id: `w-${Date.now()}`,
      day: day as DayName,
      date: new Date().toISOString(),
      durationSeconds: elapsed,
      exercises,
    };
    addWorkout(workout);
    navigate(`/summary/${workout.id}`, { state: workout });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
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
      className="px-4 pt-6 pb-8 max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{day} - Entrenamiento</h1>
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
        className="mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>
            {completedSets} de {totalSets} series
          </span>
          <span>
            {totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0}%
          </span>
        </div>
        <Progress
          value={totalSets > 0 ? (completedSets / totalSets) * 100 : 0}
          className="h-2"
        />
      </motion.div>

      {/* Exercise cards */}
      <motion.div
        className="space-y-4"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {exercises.map((ex, exIdx) => {
          const data = exerciseMap[ex.exerciseId];
          if (!data) return null;

          return (
            <motion.div key={exIdx} variants={listItemVariants}>
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-muted-foreground">IMG</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{data.name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {data.muscleGroup}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  Tiempo de descanso: {settings.defaultRestTime}m 0s
                </p>

                {/* Sets table */}
                <div className="space-y-1">
                  <div className="grid grid-cols-[2rem_3rem_1fr_1fr_2rem] gap-1 text-[10px] font-semibold text-muted-foreground px-1">
                    <span>Serie</span>
                    <span>Previo</span>
                    <span>Peso ({settings.defaultUnit})</span>
                    <span>Reps</span>
                    <span>✓</span>
                  </div>
                  {ex.sets.map((set, setIdx) => (
                    <div
                      key={setIdx}
                      className="grid grid-cols-[2rem_3rem_1fr_1fr_2rem] gap-1 items-center px-1"
                    >
                      <span className="text-xs text-center">
                        {set.setNumber}
                      </span>
                      <span className="text-xs text-muted-foreground text-center">
                        {set.previous
                          ? `${set.previous.weight}×${set.previous.reps}`
                          : "-"}
                      </span>
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
                      <div className="flex justify-center">
                        <Checkbox
                          checked={set.completed}
                          onCheckedChange={(v) =>
                            updateSet(exIdx, setIdx, "completed", v)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs w-full"
                  onClick={() => addSet(exIdx)}
                >
                  <Plus className="w-3 h-3 mr-1" /> Agregar serie
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => navigate(`/exercises?day=${day}`)}
      >
        <Plus className="w-4 h-4 mr-1" /> Agregar ejercicio
      </Button>
    </motion.div>
  );
}
