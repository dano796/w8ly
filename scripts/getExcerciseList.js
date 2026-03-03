import fs from "fs";

const API_KEY = "API_KEY";
const HOST = "exercisedb.p.rapidapi.com";

const LIMIT = 10;
let offset = 0;
let allExercises = [];

async function fetchBatch(offset) {
  const response = await fetch(
    `https://exercisedb.p.rapidapi.com/exercises?limit=${LIMIT}&offset=${offset}`,
    {
      headers: {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": HOST,
      },
    },
  );

  return response.json();
}

async function main() {
  while (true) {
    const batch = await fetchBatch(offset);

    if (!batch.length) break;

    allExercises = [...allExercises, ...batch];
    console.log(`Descargados: ${allExercises.length}`);

    offset += LIMIT;
  }

  fs.writeFileSync("allExercises.json", JSON.stringify(allExercises, null, 2));

  console.log("Lista completa guardada ✅");
}

main();
