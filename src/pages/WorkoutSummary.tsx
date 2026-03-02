import { useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { defaultExercises } from "@/utils/exerciseData";
import { CompletedWorkout, Exercise } from "@/utils/types";
import { useSettings } from "@/hooks/useSettings";
import { useCustomExercises } from "@/hooks/useCustomExercises";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { convertWeight } from "@/utils/unitConversion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ExerciseDetailSheet from "@/components/ExerciseDetailSheet";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Layers,
  Dumbbell,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  pageVariants,
  scaleInVariants,
  listContainerVariants,
  listItemVariants,
} from "@/utils/animations";
import { formatWorkoutDate } from "@/utils/formatWorkoutDate";

export default function WorkoutSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { customExercises } = useCustomExercises();
  const { getPersonalRecord } = useWorkoutHistory();
  const workout = location.state as CompletedWorkout | undefined;
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Detectar si se accedió desde el perfil
  const fromProfile = location.state && location.state.fromProfile;

  // Combine default and custom exercises
  const allExercises = [...defaultExercises, ...customExercises];
  const exerciseMap = Object.fromEntries(allExercises.map((e) => [e.id, e]));

  // Precompute the max completed set weight per exercise for this session
  const sessionMaxByExercise = useMemo(() => {
    if (!workout) return {};
    const map: Record<string, number> = {};
    workout.exercises.forEach((ex) => {
      const maxWeight = Math.max(
        0,
        ...ex.sets.filter((s) => s.completed).map((s) => s.weight),
      );
      map[ex.exerciseId] = maxWeight;
    });
    return map;
  }, [workout]);

  if (!workout) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto text-center">
        <p>No se encontró el resumen.</p>
        <Button
          className="mt-4"
          onClick={() => navigate(fromProfile ? "/profile" : "/")}
        >
          Volver
        </Button>
      </div>
    );
  }

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${sec}s`;
  };

  const totalSets = workout.exercises.reduce(
    (s, e) => s + e.sets.filter((s) => s.completed).length,
    0,
  );

  const totalVolume = workout.exercises.reduce((vol, ex) => {
    const completedSets = ex.sets.filter((s) => s.completed);
    const exerciseUnit = ex.unit || settings.defaultUnit;
    return (
      vol +
      completedSets.reduce((v, s) => {
        const weightInDefaultUnit = convertWeight(
          s.weight,
          exerciseUnit,
          settings.defaultUnit,
        );
        return v + weightInDefaultUnit * s.reps;
      }, 0)
    );
  }, 0);

  const totalExercises = workout.exercises.length;
  const exercisesWithCompletedSets = workout.exercises.filter((ex) =>
    ex.sets.some((s) => s.completed),
  ).length;

  return (
    <motion.div
      className="px-4 pt-6 pb-8 max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(fromProfile ? "/profile" : "/")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Resumen</h1>
      </div>

      {/* Success banner */}
      <motion.div
        className="flex flex-col items-center py-8"
        variants={scaleInVariants}
        initial="initial"
        animate="animate"
      >
        <CheckCircle className="w-16 h-16 text-accent mb-3" />
        <h2 className="text-xl font-bold">¡Excelente trabajo!</h2>
        <p className="text-base font-medium text-muted-foreground mt-2">
          {formatWorkoutDate(workout.date, "full")}
          {workout.label && (
            <span className="text-primary"> - {workout.label}</span>
          )}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Duración</p>
            <p className="text-base font-semibold">
              {formatDuration(workout.durationSeconds)}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Layers className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Series</p>
            <p className="text-base font-semibold">{totalSets}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Dumbbell className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Ejercicios</p>
            <p className="text-base font-semibold">
              {exercisesWithCompletedSets}/{totalExercises}
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Volumen total</p>
            <p className="text-base font-semibold">
              {totalVolume.toLocaleString()} {settings.defaultUnit}
            </p>
          </div>
        </Card>
      </div>

      {/* Completed exercises */}
      <h3 className="text-lg font-semibold text-primary mb-3">
        Ejercicios completados
      </h3>
      <motion.div
        className="space-y-3"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {workout.exercises
          .filter((ex) => ex.sets.some((s) => s.completed))
          .map((ex, i) => {
            const data = exerciseMap[ex.exerciseId];
            if (!data) return null;
            const completedSets = ex.sets.filter((s) => s.completed);
            const totalSetsForExercise = ex.sets.length;
            const allCompleted = completedSets.length === totalSetsForExercise;
            const exerciseUnit = ex.unit || settings.defaultUnit;
            const volume = completedSets.reduce((v, s) => {
              const weightInDefaultUnit = convertWeight(
                s.weight,
                exerciseUnit,
                settings.defaultUnit,
              );
              return v + weightInDefaultUnit * s.reps;
            }, 0);
            return (
              <motion.div key={i} variants={listItemVariants}>
                <Card className="p-3">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity select-none"
                      onClick={() => {
                        setDetailExercise(data);
                        setDetailSheetOpen(true);
                      }}
                    >
                      {data?.imageUrl ? (
                        <img
                          src={data.imageUrl}
                          alt={data.name}
                          className="w-full h-full object-cover pointer-events-none"
                          loading="lazy"
                          draggable={false}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          IMG
                        </span>
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setDetailExercise(data);
                        setDetailSheetOpen(true);
                      }}
                    >
                      <p className="text-base font-semibold truncate hover:text-primary transition-colors">
                        {data.name}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {data.muscleGroup}
                      </Badge>
                    </div>
                    {!allCompleted && (
                      <Badge
                        variant="outline"
                        className="text-xs text-amber-600 border-amber-600"
                      >
                        Incompleto
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Series</p>
                      <p className="text-sm font-medium mt-1">
                        {completedSets.length} de {totalSetsForExercise}{" "}
                        completadas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Volumen</p>
                      <p className="text-sm font-medium mt-1">
                        {volume.toLocaleString()} {settings.defaultUnit}
                      </p>
                    </div>
                  </div>

                  {/* Detalles de cada serie */}
                  {completedSets.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground mb-1">
                        Detalle
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {completedSets.map((set, idx) => {
                          const sessionMax =
                            sessionMaxByExercise[ex.exerciseId] ?? 0;
                          const historicRecord = getPersonalRecord(
                            ex.exerciseId,
                            exerciseUnit,
                            workout?.id,
                          );
                          const isRecord =
                            set.weight === sessionMax &&
                            set.weight > historicRecord;
                          return (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={`text-xs ${isRecord ? "text-primary border-primary font-semibold" : ""}`}
                            >
                              {isRecord && (
                                <Trophy className="w-3 h-3 mr-1 inline" />
                              )}
                              {set.weight}
                              {exerciseUnit} × {set.reps} reps
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
      </motion.div>

      <Button
        className="w-full mt-6"
        onClick={() => navigate(fromProfile ? "/profile" : "/")}
      >
        {fromProfile ? "Volver al perfil" : "Volver al planificador"}
      </Button>

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        exercise={detailExercise}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </motion.div>
  );
}
