import fs from "fs";
import path from "path";
import https from "https";

const API_KEY = "API_KEY";
const RESOLUTION = "180";

const ids = JSON.parse(fs.readFileSync("./relevantExerciseIds.json", "utf-8"));

const outputDir = "../public/exercises";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function downloadGif(exerciseId) {
  return new Promise((resolve, reject) => {
    const url = `https://exercisedb.p.rapidapi.com/image?exerciseId=${exerciseId}&resolution=${RESOLUTION}&rapidapi-key=${API_KEY}`;

    const file = fs.createWriteStream(
      path.join(outputDir, `${exerciseId}.gif`),
    );

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          console.log(`❌ Error ${exerciseId}: ${response.statusCode}`);
          resolve();
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          console.log(`✅ Descargado ${exerciseId}`);
          resolve();
        });
      })
      .on("error", (err) => {
        console.log(`❌ Error ${exerciseId}`, err.message);
        resolve();
      });
  });
}

async function downloadAll() {
  for (const id of ids) {
    await downloadGif(id);
  }

  console.log("🎉 Descarga completa");
}

downloadAll();
