import fs from "fs";

// Cargar JSON
const exercises = JSON.parse(fs.readFileSync("./allExercises.json", "utf-8"));

const allowedBodyParts = [
  "chest",
  "back",
  "upper legs",
  "lower legs",
  "shoulders",
  "upper arms",
  "lower arms",
];

const allowedEquipment = ["barbell", "dumbbell", "cable", "machine"];

const filtered = exercises.filter(
  (ex) =>
    allowedBodyParts.includes(ex.bodyPart) &&
    allowedEquipment.includes(ex.equipment),
);

const ids = filtered.map((ex) => ex.id);

console.log("Total ejercicios pertinentes:", ids.length);

fs.writeFileSync("./relevantExerciseIds.json", JSON.stringify(ids, null, 2));
