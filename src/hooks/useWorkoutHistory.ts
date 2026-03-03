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
      if (ex) return ex; // Return full exercise including unit
    }
    return undefined;
  };

  const getPersonalRecord = (
    exerciseId: string,
    unit: "kg" | "lbs" = "kg",
    excludeWorkoutId?: string,
  ) => {
    let maxWeight = 0;

    for (const w of history) {
      // Skip the workout if it should be excluded
      if (excludeWorkoutId && w.id === excludeWorkoutId) {
        continue;
      }

      const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex) {
        const completedSets = ex.sets.filter((s) => s.completed);
        const exerciseUnit = ex.unit || unit;

        for (const set of completedSets) {
          // Convert to the target unit for comparison
          let weight = set.weight;
          if (exerciseUnit !== unit) {
            // Simple conversion: 1 kg = 2.20462 lbs
            weight =
              exerciseUnit === "kg"
                ? weight * 2.20462 // kg to lbs
                : weight / 2.20462; // lbs to kg
          }

          if (weight > maxWeight) {
            maxWeight = weight;
          }
        }
      }
    }

    return maxWeight;
  };

  const getMaxRepsAtWeight = (
    exerciseId: string,
    weight: number,
    unit: "kg" | "lbs" = "kg",
    excludeWorkoutId?: string,
  ) => {
    let maxReps = 0;

    for (const w of history) {
      // Skip the workout if it should be excluded
      if (excludeWorkoutId && w.id === excludeWorkoutId) {
        continue;
      }

      const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex) {
        const completedSets = ex.sets.filter((s) => s.completed);
        const exerciseUnit = ex.unit || unit;

        for (const set of completedSets) {
          // Convert to the target unit for comparison
          let setWeight = set.weight;
          if (exerciseUnit !== unit) {
            // Simple conversion: 1 kg = 2.20462 lbs
            setWeight =
              exerciseUnit === "kg"
                ? setWeight * 2.20462 // kg to lbs
                : setWeight / 2.20462; // lbs to kg
          }

          // Check if this set has the same weight (with small tolerance for floating point)
          if (Math.abs(setWeight - weight) < 0.01) {
            if (set.reps > maxReps) {
              maxReps = set.reps;
            }
          }
        }
      }
    }

    return maxReps;
  };

  return {
    history,
    addWorkout,
    getLastPerformance,
    getPersonalRecord,
    getMaxRepsAtWeight,
  };
}
