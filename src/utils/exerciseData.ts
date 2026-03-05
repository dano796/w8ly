import { Exercise, MuscleGroup } from "./types";
import exerciseDataJson from "./exerciseData.json";

// Type for the raw exercise data from the JSON file
interface RawExerciseData {
  id: string;
  name: string;
  force: string; // ej: tracción, empuje
  level: string; // ej: principiante, intermedio, experto
  mechanic: string; // ej: aislamiento, compuesto
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

// Map primaryMuscles from JSON to our MuscleGroup categories
function mapPrimaryMusclesToMuscleGroup(primaryMuscles: string[]): MuscleGroup {
  if (!primaryMuscles || primaryMuscles.length === 0) return "Core";

  const firstMuscle = primaryMuscles[0].toLowerCase();

  const mapping: Record<string, MuscleGroup> = {
    // Core
    abdominales: "Core",
    "abdominales oblicuos": "Core",
    "abdominales inferiores": "Core",
    "espalda baja": "Core",

    // Brazos
    bíceps: "Brazos",
    tríceps: "Brazos",
    antebrazos: "Brazos",

    // Hombros
    hombros: "Hombros",
    deltoides: "Hombros",

    // Pecho
    pecho: "Pecho",
    pectorales: "Pecho",

    // Espalda
    espalda: "Espalda",
    "espalda media": "Espalda",
    dorsales: "Espalda",
    trapecios: "Espalda",

    // Pierna
    cuádriceps: "Pierna",
    glúteos: "Pierna",
    isquiotibiales: "Pierna",
    pantorrillas: "Pierna",
    aductores: "Pierna",
    abductores: "Pierna",
    "pierna completa": "Pierna",
  };

  return mapping[firstMuscle] || "Core";
}

// Map level to difficulty
function mapLevelToDifficulty(level: string): string {
  const mapping: Record<string, string> = {
    principiante: "beginner",
    intermedio: "intermediate",
    avanzado: "advanced",
    experto: "advanced",
  };
  return mapping[level.toLowerCase()] || "intermediate";
}

// Capitalize only first letter of the entire string
function capitalizeFirstOnly(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Load exercises from exerciseData.json
export const defaultExercises: Exercise[] = (
  exerciseDataJson as RawExerciseData[]
).map((exercise) => ({
  id: exercise.id,
  name: capitalizeFirstOnly(exercise.name),
  muscleGroup: mapPrimaryMusclesToMuscleGroup(exercise.primaryMuscles),
  imageUrl: `/exercises/${exercise.id}.gif`,
  force: exercise.force,
  level: exercise.level,
  mechanic: exercise.mechanic,
  equipment: exercise.equipment,
  primaryMuscles: exercise.primaryMuscles,
  secondaryMuscles: exercise.secondaryMuscles,
  instructions: exercise.instructions,
  category: exercise.category,
  difficulty: mapLevelToDifficulty(exercise.level),
}));
