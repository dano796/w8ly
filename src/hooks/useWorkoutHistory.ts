import { useLocalStorage } from './useLocalStorage';
import { CompletedWorkout } from '@/utils/types';

export function useWorkoutHistory() {
  const [history, setHistory] = useLocalStorage<CompletedWorkout[]>('w8ly-workout-history', []);

  const addWorkout = (workout: CompletedWorkout) => {
    setHistory(prev => [workout, ...prev]);
  };

  const getLastPerformance = (exerciseId: string) => {
    for (const w of history) {
      const ex = w.exercises.find(e => e.exerciseId === exerciseId);
      if (ex) return ex.sets;
    }
    return undefined;
  };

  return { history, addWorkout, getLastPerformance };
}
