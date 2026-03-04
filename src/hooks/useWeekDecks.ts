import { useLocalStorage } from "./useLocalStorage";
import { useRecentlyAddedExercises } from "./useRecentlyAddedExercises";
import { useEffect } from "react";
import {
  WeekDeck,
  DayName,
  PlannedExercise,
  DAYS,
  WeeklyPlan,
} from "@/utils/types";
import { createCustomTemplate } from "@/utils/weekTemplates";
import { generateId } from "@/lib/utils";

const TOUR_SEED_INSTANCE_ID = "__tour_seed__";

/**
 * Hook para gestionar múltiples barajas/semanas de entrenamiento
 * Permite a los usuarios tener diferentes rutinas y cambiar entre ellas
 */
export function useWeekDecks() {
  // Migración: leer plan antiguo si existe
  const migrateOldPlan = (): WeekDeck[] => {
    try {
      const oldPlan = localStorage.getItem("w8ly-weekly-plan");
      if (oldPlan) {
        const parsedPlan = JSON.parse(oldPlan);
        // Crear una baraja con el plan antiguo
        const migratedDeck: WeekDeck = {
          id: generateId(),
          name: "Mi Rutina",
          description: "Rutina migrada",
          splitType: "custom",
          plan: parsedPlan,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        // Eliminar el plan antiguo
        localStorage.removeItem("w8ly-weekly-plan");
        return [migratedDeck];
      }
    } catch (error) {
      console.error("Error al migrar plan antiguo:", error);
    }
    return [createCustomTemplate("Mi Rutina")];
  };

  // Estado: lista de todas las barajas
  const [decks, setDecks] = useLocalStorage<WeekDeck[]>(
    "w8ly-week-decks",
    migrateOldPlan(),
  );

  // Estado: ID de la baraja activa
  const [activeDeckId, setActiveDeckId] = useLocalStorage<string>(
    "w8ly-active-deck-id",
    "",
  );

  const { trackAdded } = useRecentlyAddedExercises();

  // Asegurar que siempre haya un deck activo
  useEffect(() => {
    if (!activeDeckId && decks.length > 0) {
      setActiveDeckId(decks[0].id);
    }
  }, [activeDeckId, decks, setActiveDeckId]);

  // Obtener la baraja activa
  const activeDeck =
    decks.find((d) => d.id === activeDeckId) || decks[0] || null;

  // ─── CRUD de Barajas ────────────────────────────────────────────────────────

  /**
   * Crear una nueva baraja
   */
  const createDeck = (deck: WeekDeck) => {
    // Limitar a máximo 3 rutinas
    if (decks.length >= 3) {
      return null;
    }
    setDecks((prev) => [...prev, deck]);
    // Cambiar automáticamente a la nueva rutina
    setActiveDeckId(deck.id);
    return deck.id;
  };

  /**
   * Duplicar una baraja existente
   */
  const duplicateDeck = (deckId: string, newName?: string) => {
    // Limitar a máximo 3 rutinas
    if (decks.length >= 3) {
      return null;
    }
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return null;

    const duplicated: WeekDeck = {
      ...deck,
      id: generateId(),
      name: newName || `${deck.name} (Copia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setDecks((prev) => [...prev, duplicated]);
    // Cambiar automáticamente a la rutina duplicada
    setActiveDeckId(duplicated.id);
    return duplicated.id;
  };

  /**
   * Actualizar una baraja
   */
  const updateDeck = (deckId: string, updates: Partial<WeekDeck>) => {
    setDecks((prev) =>
      prev.map((d) =>
        d.id === deckId ? { ...d, ...updates, updatedAt: Date.now() } : d,
      ),
    );
  };

  /**
   * Eliminar una baraja
   */
  const deleteDeck = (deckId: string) => {
    // No permitir eliminar si es la única baraja
    if (decks.length <= 1) return false;

    setDecks((prev) => prev.filter((d) => d.id !== deckId));

    // Si se elimina la baraja activa, cambiar a la primera disponible
    if (deckId === activeDeckId) {
      const remaining = decks.filter((d) => d.id !== deckId);
      if (remaining.length > 0) {
        setActiveDeckId(remaining[0].id);
      }
    }

    return true;
  };

  /**
   * Cambiar la baraja activa
   */
  const switchDeck = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    if (deck) {
      setActiveDeckId(deckId);
      return true;
    }
    return false;
  };

  // ─── Operaciones sobre la baraja activa ────────────────────────────────────

  /**
   * Actualizar el plan de la baraja activa
   */
  const updateActivePlan = (plan: WeeklyPlan) => {
    if (!activeDeck) return;
    updateDeck(activeDeck.id, { plan });
  };

  /**
   * Agregar un ejercicio a un día de la baraja activa
   */
  const addExerciseToDay = (day: DayName, exercise: PlannedExercise) => {
    if (!activeDeck) return;

    // No registrar el ejercicio seed del tour en el historial
    if (exercise.id !== TOUR_SEED_INSTANCE_ID) {
      trackAdded(exercise.exerciseId);
    }

    const updatedPlan = activeDeck.plan.map((d) =>
      d.day === day ? { ...d, exercises: [...d.exercises, exercise] } : d,
    );

    updateActivePlan(updatedPlan);
  };

  /**
   * Eliminar un ejercicio de un día
   */
  const removeExerciseFromDay = (day: DayName, exerciseInstanceId: string) => {
    if (!activeDeck) return;

    const updatedPlan = activeDeck.plan.map((d) =>
      d.day === day
        ? {
            ...d,
            exercises: d.exercises.filter((e) => e.id !== exerciseInstanceId),
          }
        : d,
    );

    updateActivePlan(updatedPlan);
  };

  /**
   * Actualizar la etiqueta de un día
   */
  const updateDayLabel = (day: DayName, label: string) => {
    if (!activeDeck) return;

    const updatedPlan = activeDeck.plan.map((d) =>
      d.day === day ? { ...d, label } : d,
    );

    updateActivePlan(updatedPlan);
  };

  /**
   * Reordenar ejercicios de un día
   */
  const reorderExercises = (day: DayName, exercises: PlannedExercise[]) => {
    if (!activeDeck) return;

    const updatedPlan = activeDeck.plan.map((d) =>
      d.day === day ? { ...d, exercises } : d,
    );

    updateActivePlan(updatedPlan);
  };

  /**
   * Mover un ejercicio de un día a otro
   */
  const moveExercise = (
    fromDay: DayName,
    toDay: DayName,
    exerciseInstanceId: string,
  ): boolean => {
    if (!activeDeck) return false;

    const fromDayPlan = activeDeck.plan.find((d) => d.day === fromDay);
    const exercise = fromDayPlan?.exercises.find(
      (e) => e.id === exerciseInstanceId,
    );

    if (!exercise) return false;

    const toDayPlan = activeDeck.plan.find((d) => d.day === toDay);
    const exerciseExists = toDayPlan?.exercises.some(
      (ex) => ex.exerciseId === exercise.exerciseId,
    );

    if (exerciseExists) return false;

    const updatedPlan = activeDeck.plan.map((d) => {
      if (d.day === fromDay)
        return {
          ...d,
          exercises: d.exercises.filter((e) => e.id !== exerciseInstanceId),
        };
      if (d.day === toDay)
        return { ...d, exercises: [...d.exercises, exercise] };
      return d;
    });

    updateActivePlan(updatedPlan);
    return true;
  };

  /**
   * Actualizar ejercicios de un día
   */
  const updateDayExercises = (
    day: DayName,
    exercises: PlannedExercise[],
    newExerciseIds?: string[],
  ) => {
    if (!activeDeck) return;

    if (newExerciseIds?.length) {
      newExerciseIds.forEach((id) => trackAdded(id));
    }

    const updatedPlan = activeDeck.plan.map((d) =>
      d.day === day ? { ...d, exercises } : d,
    );

    updateActivePlan(updatedPlan);
  };

  /**
   * Resetear el plan de la baraja activa (vaciar todos los ejercicios)
   */
  const resetPlan = () => {
    if (!activeDeck) return;

    const emptyPlan = DAYS.map((day) => ({ day, label: "", exercises: [] }));
    updateActivePlan(emptyPlan);
  };

  /**
   * Exportar un día como JSON
   */
  const exportDay = (day: DayName): string => {
    if (!activeDeck) throw new Error("No active deck");

    const dayPlan = activeDeck.plan.find((d) => d.day === day);
    if (!dayPlan) throw new Error("Day not found");

    return JSON.stringify(dayPlan, null, 2);
  };

  /**
   * Importar un día desde JSON
   */
  const importDay = (
    day: DayName,
    jsonData: string,
    mode: "replace" | "merge" = "replace",
  ): boolean => {
    if (!activeDeck) return false;

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

      const updatedPlan = activeDeck.plan.map((d) => {
        if (d.day !== day) return d;

        if (mode === "replace") {
          // Replace all exercises
          return {
            ...d,
            label: importedDay.label || "",
            exercises: importedDay.exercises.map((ex: PlannedExercise) => ({
              ...ex,
              id: generateId(),
            })),
          };
        } else {
          // Merge: add only non-duplicate exercises
          const existingExerciseIds = new Set(
            d.exercises.map((ex) => ex.exerciseId),
          );
          const newExercises = importedDay.exercises
            .filter(
              (ex: PlannedExercise) => !existingExerciseIds.has(ex.exerciseId),
            )
            .map((ex: PlannedExercise) => ({
              ...ex,
              id: generateId(),
            }));

          return {
            ...d,
            exercises: [...d.exercises, ...newExercises],
          };
        }
      });

      updateActivePlan(updatedPlan);

      // Track newly added exercises
      importedDay.exercises.forEach((ex: PlannedExercise) => {
        trackAdded(ex.exerciseId);
      });

      return true;
    } catch {
      return false;
    }
  };

  /**
   * Limpiar todos los ejercicios de un día
   */
  const clearDayExercises = (day: DayName) => {
    if (!activeDeck) return;

    const updatedPlan = activeDeck.plan.map((d) =>
      d.day === day
        ? {
            ...d,
            exercises: [],
          }
        : d,
    );

    updateActivePlan(updatedPlan);
  };

  /**
   * Exportar toda la baraja activa como JSON
   */
  const exportDeck = (): string => {
    if (!activeDeck) throw new Error("No active deck");
    return JSON.stringify(activeDeck, null, 2);
  };

  /**
   * Importar una baraja completa desde JSON
   */
  const importDeck = (jsonData: string): boolean => {
    try {
      const imported = JSON.parse(jsonData);

      // Validar estructura básica
      if (
        !imported ||
        typeof imported !== "object" ||
        !imported.name ||
        !Array.isArray(imported.plan)
      ) {
        return false;
      }

      // Crear nueva baraja con ID único
      const newDeck: WeekDeck = {
        ...imported,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Regenerar IDs de ejercicios para evitar conflictos
        plan: imported.plan.map((day: any) => ({
          ...day,
          exercises: day.exercises.map((ex: PlannedExercise) => ({
            ...ex,
            id: generateId(),
          })),
        })),
      };

      setDecks((prev) => [...prev, newDeck]);
      setActiveDeckId(newDeck.id);

      return true;
    } catch {
      return false;
    }
  };

  return {
    // Estado
    decks,
    activeDeck,
    activeDeckId,
    plan: activeDeck?.plan || [],

    // Gestión de barajas
    createDeck,
    duplicateDeck,
    updateDeck,
    deleteDeck,
    switchDeck,

    // Operaciones sobre la baraja activa
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
    exportDeck,
    importDeck,
  };
}
