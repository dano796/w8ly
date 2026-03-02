/**
 * tours.ts
 *
 * Archivo central de tours con Driver.js.
 * Exporta:
 *  - useWorkoutTour     → tour de ActiveWorkoutPage
 *  - useExerciseTour    → tour de ExerciseLibraryPage
 *  - usePlannerTour     → tour de WeeklyPlannerPage
 *  - resetWorkoutTour   → limpia localStorage del tour de workout
 *  - resetExerciseTour  → limpia localStorage del tour de ejercicios
 *  - resetPlannerTour   → limpia localStorage del tour del planner
 */

import { useEffect, useRef } from "react";
import { driver, DriveStep, Config } from "driver.js";
import "driver.js/dist/driver.css";

// ─────────────────────────────────────────────
// Helpers de localStorage
// ─────────────────────────────────────────────

const isTourCompleted = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const markTourCompleted = (key: string): void => {
  try {
    localStorage.setItem(key, "true");
  } catch {
    /* empty */
  }
};

export const resetWorkoutTour = (): void => {
  try {
    localStorage.removeItem("tour_workout");
  } catch {
    /* empty */
  }
};

export const resetExerciseTour = (): void => {
  try {
    localStorage.removeItem("tour_exercise_browse");
    localStorage.removeItem("tour_exercise_add");
  } catch {
    /* empty */
  }
};

export const resetPlannerTour = (): void => {
  try {
    localStorage.removeItem("tour_planner");
  } catch {
    /* empty */
  }
};

// ─────────────────────────────────────────────
// Config compartida
// ─────────────────────────────────────────────

const sharedConfig: Omit<Config, "steps" | "onDestroyed"> = {
  animate: true,
  smoothScroll: true,
  allowClose: true,
  overlayOpacity: 0.65,
  stagePadding: 6,
  stageRadius: 8,
  showProgress: true,
  progressText: "{{current}} de {{total}}",
  nextBtnText: "Siguiente →",
  prevBtnText: "← Atrás",
  doneBtnText: "¡Entendido!",
};

// ─────────────────────────────────────────────
// Hook base genérico
// ─────────────────────────────────────────────

interface UseTourOptions {
  storageKey: string;
  steps: DriveStep[];
  ready: boolean;
  forceShow?: boolean;
  delay?: number;
}

function useTour({
  storageKey,
  steps,
  ready,
  forceShow = false,
  delay = 600,
}: UseTourOptions) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const hasStartedRef = useRef(false);

  const startTour = () => {
    driverRef.current?.destroy();
    driverRef.current = driver({
      ...sharedConfig,
      steps,
      onDestroyed: () => markTourCompleted(storageKey),
    });
    driverRef.current.drive();
  };

  useEffect(() => {
    if (!ready) return;
    if (hasStartedRef.current) return;
    if (!forceShow && isTourCompleted(storageKey)) return;

    hasStartedRef.current = true;
    const timeout = setTimeout(startTour, delay);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, forceShow]);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return { startTour };
}

// ─────────────────────────────────────────────
// Tour: ActiveWorkoutPage
// ─────────────────────────────────────────────

const workoutSteps: DriveStep[] = [
  {
    element: "[data-tour='workout-header']",
    popover: {
      title: "Tu entrenamiento activo",
      description:
        "Aquí verás el día, la etiqueta de tu rutina y el tiempo transcurrido en tiempo real.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "[data-tour='workout-progress']",
    popover: {
      title: "Progreso del entrenamiento",
      description:
        "Esta barra muestra cuántas series has completado del total. Va avanzando a medida que marcas series como hechas.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#tour-exercise-card-0",
    popover: {
      title: "Tarjeta de ejercicio",
      description:
        "Cada ejercicio tiene su propia tarjeta. Toca la imagen o el nombre para ver instrucciones detalladas y músculos trabajados.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-rest-time-0",
    popover: {
      title: "Tiempo de descanso",
      description:
        "Configura cuánto tiempo descansar entre series. Al completar una serie, el temporizador arranca automáticamente.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-weight-unit-0",
    popover: {
      title: "Cambiar unidad de peso",
      description:
        'Toca el encabezado "Peso" para cambiar entre kg y lbs. Los valores se convierten automáticamente.',
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "#tour-set-row-0",
    popover: {
      title: "Registrar una serie",
      description:
        'Ingresa el peso y las reps. La columna "Previo" muestra tu última sesión como referencia. Desliza hacia la izquierda para eliminarla.',
      side: "top",
      align: "center",
    },
  },
  {
    element: "#tour-set-checkbox-0",
    popover: {
      title: "Marcar serie completa",
      description:
        "Marca el check cuando termines la serie. Si superas tu récord personal, ¡recibirás una notificación! 🏆",
      side: "left",
      align: "center",
    },
  },
  {
    element: "#tour-add-set-0",
    popover: {
      title: "Agregar serie",
      description:
        "¿Quieres hacer una serie extra? Agrégala aquí al vuelo sin salir del entrenamiento.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='add-exercise-btn']",
    popover: {
      title: "Agregar ejercicio",
      description:
        "Abre la biblioteca de ejercicios para añadir más movimientos. Tu progreso actual se conserva.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='finish-btn']",
    popover: {
      title: "Finalizar entrenamiento",
      description:
        "Cuando termines, toca aquí para guardar tu sesión y ver el resumen. Si modificaste la rutina, se te preguntará si deseas aplicar los cambios.",
      side: "left",
      align: "center",
    },
  },
];

interface UseWorkoutTourOptions {
  ready: boolean;
  forceShow?: boolean;
}

export function useWorkoutTour({
  ready,
  forceShow = false,
}: UseWorkoutTourOptions) {
  return useTour({
    storageKey: "tour_workout",
    steps: workoutSteps,
    ready,
    forceShow,
  });
}

// ─────────────────────────────────────────────
// Tour: ExerciseLibraryPage
// ─────────────────────────────────────────────

const exerciseBrowseSteps: DriveStep[] = [
  {
    element: "[data-tour='ex-search']",
    popover: {
      title: "Busca tu ejercicio",
      description:
        "Escribe el nombre del ejercicio que buscas. La búsqueda filtra en tiempo real sobre todos los ejercicios disponibles.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour='ex-filters']",
    popover: {
      title: "Filtrar por grupo muscular",
      description:
        "Toca cualquier chip para ver solo los ejercicios de ese grupo muscular. Puedes combinarlos con la búsqueda.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-ex-card-0",
    popover: {
      title: "Tarjeta de ejercicio",
      description:
        "Toca la tarjeta para ver instrucciones, músculos trabajados y más detalles. Usa el botón + para agregar el ejercicio a un día de tu rutina.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-ex-add-btn-0",
    popover: {
      title: "Agregar a tu rutina",
      description:
        "Toca + para agregar este ejercicio a un día específico. Se te preguntará a qué día de la semana quieres añadirlo.",
      side: "left",
      align: "center",
    },
  },
  {
    element: "[data-tour='ex-create-btn']",
    popover: {
      title: "Crear ejercicio personalizado",
      description:
        "¿No encuentras el ejercicio que buscas? Crea el tuyo con el nombre y grupo muscular que prefieras.",
      side: "bottom",
      align: "end",
    },
  },
];

const exerciseAddSteps: DriveStep[] = [
  {
    element: "[data-tour='ex-search']",
    popover: {
      title: "Busca un ejercicio",
      description:
        "Escribe para filtrar en tiempo real. Puedes buscar por nombre o usar los chips de abajo para filtrar por grupo muscular.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour='ex-filters']",
    popover: {
      title: "Filtrar por músculo",
      description:
        "Toca un chip para ver solo los ejercicios de ese grupo. Útil para complementar tu entrenamiento del día.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-ex-card-0",
    popover: {
      title: "Seleccionar ejercicio",
      description:
        "Toca la tarjeta para seleccionarla. Puedes seleccionar varios a la vez y agregarlos todos de un golpe.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-ex-add-btn-0",
    popover: {
      title: "Agregar directamente",
      description:
        "O toca + para agregar este ejercicio al entrenamiento de inmediato, sin seleccionar otros.",
      side: "left",
      align: "center",
    },
  },
];

interface UseExerciseTourOptions {
  ready: boolean;
  mode?: "browse" | "add";
  forceShow?: boolean;
}

export function useExerciseTour({
  ready,
  mode = "browse",
  forceShow = false,
}: UseExerciseTourOptions) {
  const steps = mode === "add" ? exerciseAddSteps : exerciseBrowseSteps;
  return useTour({
    storageKey: `tour_exercise_${mode}`,
    steps,
    ready,
    forceShow,
    delay: 400,
  });
}

// ─────────────────────────────────────────────
// Tour: WeeklyPlannerPage
//
// La vista tiene dos zonas principales:
//   1. Columnas de días (scroll horizontal tipo Trello)
//   2. Carrusel de ejercicios recientes (fijo en la parte inferior)
//
// IDs únicos necesarios (aplicar solo al primer elemento):
//   #tour-planner-day-0   → primera Card de día
//   #tour-planner-play-0  → botón ▶ del primer día (si tiene ejercicios)
//   #tour-planner-ex-0    → primera tarjeta de ejercicio dentro del primer día
//   #tour-planner-add-0   → botón + (agregar ejercicio) del primer día
//   #tour-carousel-card-0 → primera tarjeta del carrusel de recientes
//
// data-tour globales:
//   [data-tour='planner-header']       → div del título "Mi rutina semanal"
//   [data-tour='planner-carousel']     → div contenedor del carrusel
//   [data-tour='planner-carousel-all'] → botón "Ver todos"
// ─────────────────────────────────────────────

const plannerSteps: DriveStep[] = [
  {
    element: "[data-tour='planner-header']",
    popover: {
      title: "Tu rutina semanal",
      description:
        "Esta es la vista principal donde organizas tu semana de entrenamiento. Cada columna representa un día.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-planner-day-0",
    popover: {
      title: "Columna de día",
      description:
        "Cada día tiene su propia columna con los ejercicios que planificaste. Desliza horizontalmente para ver todos los días de la semana.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#tour-planner-ex-0",
    popover: {
      title: "Ejercicio en la rutina",
      description:
        "Toca la imagen o el nombre para ver los detalles del ejercicio. Usa el menú ⋮ para eliminarlo del día.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#tour-planner-play-0",
    popover: {
      title: "Iniciar entrenamiento",
      description:
        "Cuando estés listo, toca ▶ para comenzar el entrenamiento del día. Se abrirá la vista de entrenamiento activo.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "#tour-planner-add-0",
    popover: {
      title: "Agregar ejercicio al día",
      description:
        "Toca + para abrir la biblioteca de ejercicios y agregar más movimientos a este día.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='planner-carousel']",
    popover: {
      title: "Ejercicios recientes",
      description:
        "Aquí aparecen los ejercicios que ya tienes en tu rutina. Mantenlos presionados y arrástralos a cualquier columna para agregarlos rápidamente.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "#tour-carousel-card-0",
    popover: {
      title: "Arrastrar al día",
      description:
        "Mantén presionado esta tarjeta y arrástrala sobre la columna del día donde quieras añadir el ejercicio. Sentirás una vibración al activarse.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "[data-tour='planner-carousel-all']",
    popover: {
      title: "Ver todos los ejercicios",
      description:
        "Explora el catálogo completo de ejercicios disponibles para construir o ampliar tu rutina.",
      side: "top",
      align: "end",
    },
  },
];

// Índice del paso que apunta al botón + (dentro de la columna de día).
// Si el carrusel lo tapa en pantallas pequeñas, lo colapsamos antes
// de resaltarlo y lo restauramos al salir de ese paso.
const ADD_BTN_STEP_INDEX = plannerSteps.findIndex(
  (s) => s.element === "#tour-planner-add-0",
);

interface UsePlannerTourOptions {
  /** true cuando el plan está cargado y al menos un día está renderizado */
  ready: boolean;
  /**
   * Setter del estado isCarouselCollapsed de WeeklyPlannerPage.
   * El hook lo usa para colapsar/restaurar el carrusel en el paso del botón +.
   */
  setCarouselCollapsed: (collapsed: boolean) => void;
  forceShow?: boolean;
}

export function usePlannerTour({
  ready,
  setCarouselCollapsed,
  forceShow = false,
}: UsePlannerTourOptions) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const hasStartedRef = useRef(false);
  // Guarda el estado original del carrusel para restaurarlo al salir del paso
  const carouselWasCollapsedRef = useRef(false);

  const startTour = () => {
    driverRef.current?.destroy();
    driverRef.current = driver({
      ...sharedConfig,
      steps: plannerSteps,
      onHighlightStarted: (_element, step, { state }) => {
        if (state.activeIndex === ADD_BTN_STEP_INDEX) {
          // Detecta si el carrusel está colapsado antes de tocarlo
          const carouselCard = document.querySelector("#tour-carousel-card-0");
          carouselWasCollapsedRef.current = !carouselCard;
          // Colapsa el carrusel para que el botón + quede visible
          setCarouselCollapsed(true);
        }
        // Al avanzar a los pasos del carrusel, lo vuelve a abrir
        if (state.activeIndex > ADD_BTN_STEP_INDEX) {
          setCarouselCollapsed(false);
        }
      },
      onDeselected: (_element, step, { state }) => {
        // Si retrocede desde el paso del carrusel al del botón +, vuelve a colapsar
        if (state.activeIndex === ADD_BTN_STEP_INDEX + 1) {
          setCarouselCollapsed(true);
        }
      },
      onDestroyed: () => {
        // Restaura el estado original del carrusel al cerrar el tour
        setCarouselCollapsed(carouselWasCollapsedRef.current);
        markTourCompleted("tour_planner");
      },
    });
    driverRef.current.drive();
  };

  useEffect(() => {
    if (!ready) return;
    if (hasStartedRef.current) return;
    if (!forceShow && isTourCompleted("tour_planner")) return;

    hasStartedRef.current = true;
    const timeout = setTimeout(startTour, 700);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, forceShow]);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return { startTour };
}
