import fs from "fs";

const relevantExerciseIds = JSON.parse(
  fs.readFileSync("./relevantExerciseIds.json", "utf-8"),
);

const API_KEY = "09bfbafd28msh9f2bf7df8fb3b87p1009bejsn604bbf4caa21";
const API_HOST = "exercisedb.p.rapidapi.com";

const exerciseIds = relevantExerciseIds;

async function fetchExercise(id) {
  try {
    const response = await fetch(
      `https://${API_HOST}/exercises/exercise/${id}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": API_KEY,
          "X-RapidAPI-Host": API_HOST,
        },
      },
    );

    if (!response.ok) {
      console.log(`❌ Error ${id}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ ${id}`);
    return data;
  } catch (error) {
    console.log(`❌ Error ${id}:`, error.message);
    return null;
  }
}

async function fetchAll() {
  const results = [];

  for (const id of exerciseIds) {
    const data = await fetchExercise(id);
    if (data) results.push(data);

    // pequeña pausa para evitar rate limit
    await new Promise((res) => setTimeout(res, 200));
  }

  fs.writeFileSync("./exercisesData.json", JSON.stringify(results, null, 2));

  console.log("🎉 Archivo exercisesData.json creado");
}

fetchAll();
