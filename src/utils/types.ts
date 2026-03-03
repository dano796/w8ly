export type MuscleGroup =
  | "Pecho"
  | "Espalda"
  | "Pierna"
  | "Brazos"
  | "Hombros"
  | "Core";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  imageUrl?: string;
  // Extended exercise data
  bodyPart?: string;
  equipment?: string;
  target?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  description?: string;
  difficulty?: string;
  category?: string;
}

export type DayName =
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes"
  | "Sábado"
  | "Domingo";

export interface PlannedExercise {
  id: string; // unique instance id
  exerciseId: string;
  sets: number;
  reps: number;
  restTime?: number; // rest time in seconds (optional, defaults to settings)
}

export interface DayPlan {
  day: DayName;
  label: string; // e.g. "Torso A"
  exercises: PlannedExercise[];
}

export type WeeklyPlan = DayPlan[];

export interface WorkoutSet {
  setNumber: number;
  previous?: { weight: number; reps: number };
  weight: number;
  reps: number;
  completed: boolean;
  recordType?: "weight" | "volume"; // Type of personal record achieved
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
  unit?: "lbs" | "kg"; // Unit preference for this exercise
  notes?: string;
}

export interface ActiveWorkout {
  day: DayName;
  startTime: number; // timestamp
  exercises: WorkoutExercise[];
}

export interface CompletedWorkout {
  id: string;
  day: DayName;
  label?: string; // custom title for the routine
  date: string; // ISO
  durationSeconds: number;
  exercises: WorkoutExercise[];
}

export interface Settings {
  darkMode: boolean;
  defaultSets: number;
  defaultUnit: "lbs" | "kg";
  defaultRestTime: number; // minutes
  confirmOnFinish: boolean;
}

export interface Profile {
  name: string;
  email: string;
}

export const DAYS: DayName[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
