import { useLocalStorage } from "./useLocalStorage";

const STORAGE_KEY = "w8ly-recently-added-exercises";
const MAX_RECENT = 10;

/**
 * Mantiene un historial de los últimos MAX_RECENT ejercicios añadidos
 * a cualquier día del plan. El orden es del más reciente al más antiguo.
 * Los ejercicios persisten aunque el usuario los elimine de un día.
 */
export function useRecentlyAddedExercises() {
  const [recentIds, setRecentIds] = useLocalStorage<string[]>(STORAGE_KEY, []);

  /**
   * Registra un ejercicio como "recién añadido".
   * Si ya existía en la lista, lo mueve al frente.
   */
  const trackAdded = (exerciseId: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== exerciseId);
      return [exerciseId, ...filtered].slice(0, MAX_RECENT);
    });
  };

  return { recentIds, trackAdded };
}

export default useRecentlyAddedExercises;
