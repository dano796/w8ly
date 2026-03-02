import { useLocalStorage } from "./useLocalStorage";
import { WeeklyPlan, DayName, PlannedExercise, DAYS } from "@/utils/types";

const createEmptyPlan = (): WeeklyPlan =>
  DAYS.map((day) => ({ day, label: "", exercises: [] }));

export function useWeeklyPlan() {
  const [plan, setPlan] = useLocalStorage<WeeklyPlan>(
    "w8ly-weekly-plan",
    createEmptyPlan(),
  );

  const addExerciseToDay = (day: DayName, exercise: PlannedExercise) => {
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
  ) => {
    setPlan((prev) => {
      const fromDayPlan = prev.find((d) => d.day === fromDay);
      const exercise = fromDayPlan?.exercises.find(
        (e) => e.id === exerciseInstanceId,
      );
      if (!exercise) return prev;
      return prev.map((d) => {
        if (d.day === fromDay)
          return {
            ...d,
            exercises: d.exercises.filter((e) => e.id !== exerciseInstanceId),
          };
        if (d.day === toDay)
          return { ...d, exercises: [...d.exercises, exercise] };
        return d;
      });
    });
  };

  const resetPlan = () => setPlan(createEmptyPlan());

  return {
    plan,
    addExerciseToDay,
    removeExerciseFromDay,
    updateDayLabel,
    reorderExercises,
    moveExercise,
    resetPlan,
  };
}
