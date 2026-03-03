import { useLocalStorage } from "./useLocalStorage";
import { useRecentlyAddedExercises } from "./useRecentlyAddedExercises";
import { WeeklyPlan, DayName, PlannedExercise, DAYS } from "@/utils/types";

const TOUR_SEED_INSTANCE_ID = "__tour_seed__";

const createEmptyPlan = (): WeeklyPlan =>
  DAYS.map((day) => ({ day, label: "", exercises: [] }));

export function useWeeklyPlan() {
  const [plan, setPlan] = useLocalStorage<WeeklyPlan>(
    "w8ly-weekly-plan",
    createEmptyPlan(),
  );
  const { trackAdded } = useRecentlyAddedExercises();

  const addExerciseToDay = (day: DayName, exercise: PlannedExercise) => {
    // No registrar el ejercicio seed del tour en el historial
    if (exercise.id !== TOUR_SEED_INSTANCE_ID) {
      trackAdded(exercise.exerciseId);
    }
    setPlan((prev) =>
      prev.map((d) =>
        d.day === day ? { ...d, exercises: [...d.exercises, exercise] } : d,
      ),
    );
  };

  const removeExerciseFromDay = (day: DayName, exerciseInstanceId: string) => {
    setPlan((prev) =>
      prev.map((d) =>
        d.day === day
          ? {
              ...d,
              exercises: d.exercises.filter((e) => e.id !== exerciseInstanceId),
            }
          : d,
      ),
    );
  };

  const updateDayLabel = (day: DayName, label: string) => {
    setPlan((prev) => prev.map((d) => (d.day === day ? { ...d, label } : d)));
  };

  const reorderExercises = (day: DayName, exercises: PlannedExercise[]) => {
    setPlan((prev) =>
      prev.map((d) => (d.day === day ? { ...d, exercises } : d)),
    );
  };

  const moveExercise = (
    fromDay: DayName,
    toDay: DayName,
    exerciseInstanceId: string,
  ): boolean => {
    const fromDayPlan = plan.find((d) => d.day === fromDay);
    const exercise = fromDayPlan?.exercises.find(
      (e) => e.id === exerciseInstanceId,
    );

    if (!exercise) return false;

    const toDayPlan = plan.find((d) => d.day === toDay);
    const exerciseExists = toDayPlan?.exercises.some(
      (ex) => ex.exerciseId === exercise.exerciseId,
    );

    if (exerciseExists) return false;

    setPlan((prev) =>
      prev.map((d) => {
        if (d.day === fromDay)
          return {
            ...d,
            exercises: d.exercises.filter((e) => e.id !== exerciseInstanceId),
          };
        if (d.day === toDay)
          return { ...d, exercises: [...d.exercises, exercise] };
        return d;
      }),
    );

    return true;
  };

  const updateDayExercises = (
    day: DayName,
    exercises: PlannedExercise[],
    newExerciseIds?: string[], // IDs a trackear (solo los recién añadidos)
  ) => {
    if (newExerciseIds?.length) {
      newExerciseIds.forEach((id) => trackAdded(id));
    }
    setPlan((prev) =>
      prev.map((d) => (d.day === day ? { ...d, exercises } : d)),
    );
  };

  const resetPlan = () => setPlan(createEmptyPlan());

  const exportDay = (day: DayName): string => {
    const dayPlan = plan.find((d) => d.day === day);
    if (!dayPlan) throw new Error("Day not found");

    return JSON.stringify(dayPlan, null, 2);
  };

  const importDay = (
    day: DayName,
    jsonData: string,
    mode: "replace" | "merge" = "replace",
  ): boolean => {
    try {
      const importedDay = JSON.parse(jsonData);

      // Validate structure
      if (
        !importedDay ||
        typeof importedDay !== "object" ||
        !Array.isArray(importedDay.exercises)
      ) {
        return false;
      }

      setPlan((prev) =>
        prev.map((d) => {
          if (d.day !== day) return d;

          if (mode === "replace") {
            // Replace all exercises
            return {
              ...d,
              label: importedDay.label || "",
              exercises: importedDay.exercises.map((ex: PlannedExercise) => ({
                ...ex,
                id: crypto.randomUUID(),
              })),
            };
          } else {
            // Merge: add only non-duplicate exercises
            const existingExerciseIds = new Set(
              d.exercises.map((ex) => ex.exerciseId),
            );
            const newExercises = importedDay.exercises
              .filter(
                (ex: PlannedExercise) =>
                  !existingExerciseIds.has(ex.exerciseId),
              )
              .map((ex: PlannedExercise) => ({
                ...ex,
                id: crypto.randomUUID(),
              }));

            return {
              ...d,
              exercises: [...d.exercises, ...newExercises],
            };
          }
        }),
      );

      // Track newly added exercises
      importedDay.exercises.forEach((ex: PlannedExercise) => {
        trackAdded(ex.exerciseId);
      });

      return true;
    } catch {
      return false;
    }
  };

  const clearDayExercises = (day: DayName) => {
    setPlan((prev) =>
      prev.map((d) =>
        d.day === day
          ? {
              ...d,
              exercises: [],
            }
          : d,
      ),
    );
  };

  return {
    plan,
    addExerciseToDay,
    removeExerciseFromDay,
    updateDayLabel,
    reorderExercises,
    moveExercise,
    updateDayExercises,
    resetPlan,
    exportDay,
    importDay,
    clearDayExercises,
  };
}
