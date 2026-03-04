import { WeekDeck, DayPlan, DAYS, PlannedExercise, WeeklyPlan } from "./types";
import { generateId } from "@/lib/utils";

/**
 * Plantillas predefinidas de rutinas semanales
 * Estas plantillas incluyen IDs de ejercicios populares que deben existir en exercisesData.json
 */

const createEmptyPlan = (): WeeklyPlan =>
  DAYS.map((day) => ({ day, label: "", exercises: [], id: generateId() }));

// Helper para crear ejercicios planificados
const createExercise = (
  exerciseId: string,
  sets: number = 3,
  reps: number = 10,
): PlannedExercise => ({
  id: generateId(),
  exerciseId,
  sets,
  reps,
});

// ─── PLANTILLA PPL (Push/Pull/Legs) ──────────────────────────────────────────
/**
 * PPL - Rutina de 6 días (Push/Pull/Legs x2)
 * Nivel: Intermedio/Avanzado
 */
export const createPPLTemplate = (): WeekDeck => {
  const plan: WeeklyPlan = [
    {
      day: "Lunes",
      label: "Push (Empuje)",
      exercises: [
        // Press de banca
        createExercise("0025", 4, 8),
        // Press inclinado con mancuernas
        createExercise("0031", 3, 10),
        // Press militar
        createExercise("0414", 3, 8),
        // Elevaciones laterales
        createExercise("0451", 3, 12),
        // Fondos en paralelas
        createExercise("0090", 3, 10),
        // Extensiones de tríceps
        createExercise("1360", 3, 12),
      ],
    },
    {
      day: "Martes",
      label: "Pull (Tracción)",
      exercises: [
        // Dominadas
        createExercise("0654", 4, 8),
        // Remo con barra
        createExercise("0027", 3, 8),
        // Jalón al pecho
        createExercise("0139", 3, 10),
        // Remo con mancuerna
        createExercise("0767", 3, 10),
        // Curl con barra
        createExercise("0034", 3, 10),
        // Curl martillo
        createExercise("0117", 3, 12),
      ],
    },
    {
      day: "Miércoles",
      label: "Legs (Pierna)",
      exercises: [
        // Sentadilla
        createExercise("0043", 4, 8),
        // Peso muerto rumano
        createExercise("0520", 3, 10),
        // Prensa de pierna
        createExercise("0601", 3, 12),
        // Zancadas
        createExercise("0613", 3, 10),
        // Curl femoral
        createExercise("0640", 3, 12),
        // Elevaciones de gemelos
        createExercise("1378", 4, 15),
      ],
    },
    {
      day: "Jueves",
      label: "Push (Empuje)",
      exercises: [
        // Press inclinado con barra
        createExercise("0346", 4, 8),
        // Aperturas con mancuernas
        createExercise("0001", 3, 12),
        // Press Arnold
        createExercise("0028", 3, 10),
        // Elevaciones frontales
        createExercise("0459", 3, 12),
        // Press francés
        createExercise("0607", 3, 10),
        // Patada de tríceps
        createExercise("1432", 3, 12),
      ],
    },
    {
      day: "Viernes",
      label: "Pull (Tracción)",
      exercises: [
        // Peso muerto
        createExercise("0032", 4, 6),
        // Dominadas agarre cerrado
        createExercise("0178", 3, 8),
        // Remo en polea baja
        createExercise("0152", 3, 10),
        // Pull-over
        createExercise("0199", 3, 12),
        // Curl inclinado
        createExercise("0314", 3, 10),
        // Curl concentrado
        createExercise("0186", 3, 12),
      ],
    },
    {
      day: "Sábado",
      label: "Legs (Pierna)",
      exercises: [
        // Sentadilla frontal
        createExercise("0461", 4, 8),
        // Peso muerto piernas rígidas
        createExercise("0749", 3, 10),
        // Extensiones de cuádriceps
        createExercise("0606", 3, 12),
        // Peso muerto búlgaro
        createExercise("0077", 3, 10),
        // Curl femoral sentado
        createExercise("1382", 3, 12),
        // Elevaciones de gemelos sentado
        createExercise("1372", 4, 15),
      ],
    },
    {
      day: "Domingo",
      label: "Descanso",
      exercises: [],
    },
  ];

  return {
    id: generateId(),
    name: "PPL - Push/Pull/Legs",
    description:
      "Rutina de 6 días dividiendo empuje, tracción y pierna. Ideal para nivel intermedio/avanzado.",
    level: "intermediate",
    splitType: "ppl",
    plan,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// ─── PLANTILLA UL (Upper/Lower) ──────────────────────────────────────────────
/**
 * UL - Rutina de 4 días (Upper/Lower x2)
 * Nivel: Intermedio
 */
export const createULTemplate = (): WeekDeck => {
  const plan: WeeklyPlan = [
    {
      day: "Lunes",
      label: "Tren Superior A",
      exercises: [
        // Press de banca
        createExercise("0025", 4, 8),
        // Remo con barra
        createExercise("0027", 4, 8),
        // Press militar
        createExercise("0414", 3, 10),
        // Jalón al pecho
        createExercise("0139", 3, 10),
        // Curl con barra
        createExercise("0034", 3, 10),
        // Fondos en paralelas
        createExercise("0090", 3, 10),
      ],
    },
    {
      day: "Martes",
      label: "Tren Inferior A",
      exercises: [
        // Sentadilla
        createExercise("0043", 4, 8),
        // Peso muerto rumano
        createExercise("0520", 3, 10),
        // Prensa de pierna
        createExercise("0601", 3, 12),
        // Curl femoral
        createExercise("0640", 3, 12),
        // Extensiones de cuádriceps
        createExercise("0606", 3, 12),
        // Elevaciones de gemelos
        createExercise("1378", 4, 15),
      ],
    },
    {
      day: "Miércoles",
      label: "Descanso",
      exercises: [],
    },
    {
      day: "Jueves",
      label: "Tren Superior B",
      exercises: [
        // Press inclinado con mancuernas
        createExercise("0031", 4, 10),
        // Dominadas
        createExercise("0654", 4, 8),
        // Elevaciones laterales
        createExercise("0451", 3, 12),
        // Remo con mancuerna
        createExercise("0767", 3, 10),
        // Curl martillo
        createExercise("0117", 3, 12),
        // Extensiones de tríceps
        createExercise("1360", 3, 12),
      ],
    },
    {
      day: "Viernes",
      label: "Tren Inferior B",
      exercises: [
        // Peso muerto
        createExercise("0032", 4, 6),
        // Sentadilla frontal
        createExercise("0461", 3, 8),
        // Zancadas
        createExercise("0613", 3, 10),
        // Curl femoral sentado
        createExercise("1382", 3, 12),
        // Peso muerto búlgaro
        createExercise("0077", 3, 10),
        // Elevaciones de gemelos sentado
        createExercise("1372", 4, 15),
      ],
    },
    {
      day: "Sábado",
      label: "Descanso",
      exercises: [],
    },
    {
      day: "Domingo",
      label: "Descanso",
      exercises: [],
    },
  ];

  return {
    id: generateId(),
    name: "UL - Upper/Lower",
    description:
      "Rutina de 4 días alternando tren superior e inferior. Ideal para nivel intermedio.",
    level: "intermediate",
    splitType: "ul",
    plan,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// ─── PLANTILLA FB (Full Body) ────────────────────────────────────────────────
/**
 * FB - Rutina de cuerpo completo 3 días
 * Nivel: Principiante/Intermedio
 */
export const createFBTemplate = (): WeekDeck => {
  const plan: WeeklyPlan = [
    {
      day: "Lunes",
      label: "Cuerpo Completo A",
      exercises: [
        // Sentadilla
        createExercise("0043", 3, 10),
        // Press de banca
        createExercise("0025", 3, 10),
        // Remo con barra
        createExercise("0027", 3, 10),
        // Press militar
        createExercise("0414", 3, 10),
        // Curl con barra
        createExercise("0034", 2, 12),
        // Fondos en paralelas
        createExercise("0090", 2, 12),
      ],
    },
    {
      day: "Martes",
      label: "Descanso",
      exercises: [],
    },
    {
      day: "Miércoles",
      label: "Cuerpo Completo B",
      exercises: [
        // Peso muerto
        createExercise("0032", 3, 8),
        // Press inclinado con mancuernas
        createExercise("0031", 3, 10),
        // Dominadas
        createExercise("0654", 3, 8),
        // Prensa de pierna
        createExercise("0601", 3, 12),
        // Elevaciones laterales
        createExercise("0451", 3, 12),
        // Curl martillo
        createExercise("0117", 2, 12),
      ],
    },
    {
      day: "Jueves",
      label: "Descanso",
      exercises: [],
    },
    {
      day: "Viernes",
      label: "Cuerpo Completo C",
      exercises: [
        // Sentadilla frontal
        createExercise("0461", 3, 10),
        // Aperturas con mancuernas
        createExercise("0001", 3, 12),
        // Jalón al pecho
        createExercise("0139", 3, 10),
        // Peso muerto rumano
        createExercise("0520", 3, 10),
        // Press Arnold
        createExercise("0028", 3, 10),
        // Extensiones de tríceps
        createExercise("1360", 2, 12),
      ],
    },
    {
      day: "Sábado",
      label: "Descanso",
      exercises: [],
    },
    {
      day: "Domingo",
      label: "Descanso",
      exercises: [],
    },
  ];

  return {
    id: generateId(),
    name: "FB - Full Body",
    description:
      "Rutina de cuerpo completo 3 días por semana. Ideal para principiantes.",
    level: "beginner",
    splitType: "fb",
    plan,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// ─── PLANTILLA BRO SPLIT ─────────────────────────────────────────────────────
/**
 * Bro Split - Rutina de 5 días por grupo muscular
 * Nivel: Intermedio/Avanzado
 */
export const createBroSplitTemplate = (): WeekDeck => {
  const plan: WeeklyPlan = [
    {
      day: "Lunes",
      label: "Pecho",
      exercises: [
        // Press de banca
        createExercise("0025", 4, 8),
        // Press inclinado
        createExercise("0346", 3, 10),
        // Aperturas con mancuernas
        createExercise("0001", 3, 12),
        // Press declinado
        createExercise("0203", 3, 10),
        // Cruce de poleas
        createExercise("0223", 3, 12),
        // Fondos para pecho
        createExercise("0323", 3, 12),
      ],
    },
    {
      day: "Martes",
      label: "Espalda",
      exercises: [
        // Peso muerto
        createExercise("0032", 4, 6),
        // Dominadas
        createExercise("0654", 4, 8),
        // Remo con barra
        createExercise("0027", 3, 10),
        // Jalón al pecho
        createExercise("0139", 3, 10),
        // Remo con mancuerna
        createExercise("0767", 3, 10),
        // Pull-over
        createExercise("0199", 3, 12),
      ],
    },
    {
      day: "Miércoles",
      label: "Hombros",
      exercises: [
        // Press militar
        createExercise("0414", 4, 8),
        // Press Arnold
        createExercise("0028", 3, 10),
        // Elevaciones laterales
        createExercise("0451", 4, 12),
        // Elevaciones frontales
        createExercise("0459", 3, 12),
        // Pájaros
        createExercise("0056", 3, 12),
        // Encogimientos
        createExercise("0049", 4, 12),
      ],
    },
    {
      day: "Jueves",
      label: "Brazos",
      exercises: [
        // Curl con barra
        createExercise("0034", 4, 10),
        // Fondos para tríceps
        createExercise("0090", 4, 10),
        // Curl martillo
        createExercise("0117", 3, 12),
        // Extensiones de tríceps
        createExercise("1360", 3, 12),
        // Curl concentrado
        createExercise("0186", 3, 12),
        // Press francés
        createExercise("0607", 3, 10),
      ],
    },
    {
      day: "Viernes",
      label: "Pierna",
      exercises: [
        // Sentadilla
        createExercise("0043", 4, 8),
        // Peso muerto rumano
        createExercise("0520", 3, 10),
        // Prensa de pierna
        createExercise("0601", 3, 12),
        // Extensiones de cuádriceps
        createExercise("0606", 3, 12),
        // Curl femoral
        createExercise("0640", 3, 12),
        // Elevaciones de gemelos
        createExercise("1378", 4, 15),
      ],
    },
    {
      day: "Sábado",
      label: "Descanso",
      exercises: [],
    },
    {
      day: "Domingo",
      label: "Descanso",
      exercises: [],
    },
  ];

  return {
    id: generateId(),
    name: "Bro Split - 5 días",
    description:
      "Rutina clásica dividiendo cada grupo muscular en un día. Nivel intermedio/avanzado.",
    level: "intermediate",
    splitType: "brosplit",
    plan,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// ─── PLANTILLA VACÍA PERSONALIZADA ──────────────────────────────────────────
/**
 * Crea una baraja vacía para personalizar
 */
export const createCustomTemplate = (name?: string): WeekDeck => {
  return {
    id: generateId(),
    name: name || "Mi Rutina Personalizada",
    description: "Rutina personalizada creada por ti",
    splitType: "custom",
    plan: createEmptyPlan(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

// ─── CATÁLOGO DE PLANTILLAS ─────────────────────────────────────────────────
export const TEMPLATE_CATALOG = {
  fb: {
    name: "Full Body",
    shortName: "FB",
    description: "3 días de cuerpo completo",
    level: "beginner" as const,
    create: createFBTemplate,
  },
  ul: {
    name: "Upper/Lower",
    shortName: "UL",
    description: "4 días alternando superior/inferior",
    level: "intermediate" as const,
    create: createULTemplate,
  },
  ppl: {
    name: "Push/Pull/Legs",
    shortName: "PPL",
    description: "6 días de empuje/tracción/pierna",
    level: "intermediate" as const,
    create: createPPLTemplate,
  },
  brosplit: {
    name: "Bro Split",
    shortName: "5-Day",
    description: "5 días, un músculo por día",
    level: "intermediate" as const,
    create: createBroSplitTemplate,
  },
  custom: {
    name: "Personalizada",
    shortName: "Custom",
    description: "Crea tu propia rutina",
    level: "beginner" as const,
    create: createCustomTemplate,
  },
} as const;
