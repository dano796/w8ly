import { useLocalStorage } from "./useLocalStorage";
import { CompletedWorkout } from "@/utils/types";

export function useWorkoutHistory() {
  const [history, setHistory] = useLocalStorage<CompletedWorkout[]>(
    "w8ly-workout-history",
    [],
  );

  const addWorkout = (workout: CompletedWorkout) => {
    // Immediately update localStorage synchronously
    try {
      const currentHistory = JSON.parse(
        window.localStorage.getItem("w8ly-workout-history") || "[]",
      );
      const newHistory = [workout, ...currentHistory];
      window.localStorage.setItem(
        "w8ly-workout-history",
        JSON.stringify(newHistory),
      );

      // Then update React state
      setHistory(newHistory);
    } catch (e) {
      console.error("Error saving workout:", e);
    }
  };

  const getLastPerformance = (exerciseId: string) => {
    for (const w of history) {
      const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex) return ex.sets;
    }
    return undefined;
  };

  return { history, addWorkout, getLastPerformance };
}
