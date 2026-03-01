import { Exercise, MuscleGroup } from "./types";
import exercisesDataJson from "./exercisesData.json";

// Type for the raw exercise data from the JSON file (already translated to Spanish)
interface RawExerciseData {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  description: string;
  difficulty: string;
  category: string;
}

// Map bodyPart from JSON to our MuscleGroup categories
function mapBodyPartToMuscleGroup(bodyPart: string): MuscleGroup {
  const mapping: Record<string, MuscleGroup> = {
    pecho: "Pecho",
    espalda: "Espalda",
    "piernas inferiores": "Pierna",
    "piernas superiores": "Pierna",
    hombros: "Hombros",
    "brazos superiores": "Brazos",
    antebrazos: "Brazos",
    cintura: "Core",
    cardio: "Core",
    cuello: "Core",
  };
  return mapping[bodyPart.toLowerCase()] || "Core";
}

// Load exercises (already translated in JSON)
export const defaultExercises: Exercise[] = (
  exercisesDataJson as RawExerciseData[]
).map((exercise) => ({
  id: exercise.id,
  name: exercise.name,
  muscleGroup: mapBodyPartToMuscleGroup(exercise.bodyPart),
  imageUrl: `/exercises/${exercise.id}.gif`,
  bodyPart: exercise.bodyPart,
  equipment: exercise.equipment,
  target: exercise.target,
  secondaryMuscles: exercise.secondaryMuscles,
  instructions: exercise.instructions,
  description: exercise.description,
  difficulty: exercise.difficulty,
  category: exercise.category,
}));
