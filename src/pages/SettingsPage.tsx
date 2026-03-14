import { useSettings } from "@/hooks/useSettings";
import { useWeekDecks } from "@/hooks/useWeekDecks";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useCustomExercises } from "@/hooks/useCustomExercises";
import { defaultExercises } from "@/utils/exerciseData";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { pageVariants, tapAnimation } from "@/utils/animations";

function ChipSelector<T extends string | number>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o, idx) => (
        <motion.button
          key={String(o)}
          onClick={() => onChange(o)}
          className={cn(
            "px-3 py-1.5 rounded-2xl text-sm font-medium border transition-colors",
            value === o
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border",
          )}
          whileTap={tapAnimation}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.05 }}
        >
          {renderLabel ? renderLabel(o) : String(o)}
        </motion.button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings();
  const { resetPlan } = useWeekDecks();
  const { history } = useWorkoutHistory();
  const { customExercises } = useCustomExercises();

  // Combine default and custom exercises
  const allExercises = [...defaultExercises, ...customExercises];
  const exerciseMap = Object.fromEntries(allExercises.map((e) => [e.id, e]));

  const exportToCSV = () => {
    if (history.length === 0) {
      toast.error("No hay entrenamientos para exportar");
      return;
    }

    // CSV headers
    const headers = [
      "Fecha",
      "Día",
      "Etiqueta",
      "Duración (min)",
      "Ejercicio",
      "Grupo Muscular",
      "Serie",
      "Peso",
      "Unidad",
      "Repeticiones",
      "Completado",
    ];

    const rows: string[][] = [headers];

    // Process each workout
    history.forEach((workout) => {
      const workoutDate = new Date(workout.date).toLocaleDateString("es-ES");
      const durationMin = Math.floor(workout.durationSeconds / 60);

      workout.exercises.forEach((exercise) => {
        const exerciseData = exerciseMap[exercise.exerciseId];
        const exerciseName = exerciseData?.name || "Desconocido";
        const muscleGroup = exerciseData?.muscleGroup || "N/A";
        const unit = exercise.unit || settings.defaultUnit;

        exercise.sets.forEach((set, idx) => {
          rows.push([
            workoutDate,
            workout.day,
            workout.label || "",
            durationMin.toString(),
            exerciseName,
            muscleGroup,
            (idx + 1).toString(),
            set.weight.toString(),
            unit,
            set.reps.toString(),
            set.completed ? "Sí" : "No",
          ]);
        });
      });
    });

    // Convert to CSV string
    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Detección de entorno
    const fileName = `w8ly-entrenamientos-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    const isNative =
      typeof window !== "undefined" && !!(window as any).Capacitor;

    (async () => {
      try {
        if (isNative) {
          // Exportar usando Filesystem y Share
          const { Filesystem, Directory, Encoding } = await import(
            "@capacitor/filesystem"
          );
          const { Share } = await import("@capacitor/share");
          const result = await Filesystem.writeFile({
            path: fileName,
            data: csvContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
          await Share.share({
            title: "Exportar entrenamientos",
            text: "Aquí tienes tus datos de entrenamiento",
            url: result.uri,
            dialogTitle: "Guardar o enviar CSV",
          });
        } else {
          // Exportar usando Blob y descarga directa
          const dataBlob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        toast.success("Datos exportados exitosamente");
      } catch (error) {
        toast.error("Error al exportar los datos");
      }
    })();
  };

  return (
    <motion.div
      className="max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="sticky top-0 z-10 bg-background px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Configuración</h1>
      </div>

      <div className="px-4">
        <div className="space-y-4">
          {/* Dark mode */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-base font-medium">Modo oscuro</span>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(v) => updateSetting("darkMode", v)}
              />
            </CardContent>
          </Card>

          {/* Default sets */}
          <Card>
            <CardContent className="p-4">
              <p className="text-base font-medium mb-3">Series por defecto</p>
              <ChipSelector
                options={[2, 3, 4, 5]}
                value={settings.defaultSets}
                onChange={(v) => updateSetting("defaultSets", v)}
              />
            </CardContent>
          </Card>

          {/* Default unit */}
          <Card>
            <CardContent className="p-4">
              <p className="text-base font-medium mb-3">Unidades por defecto</p>
              <ChipSelector
                options={["lbs" as const, "kg" as const]}
                value={settings.defaultUnit}
                onChange={(v) => updateSetting("defaultUnit", v)}
              />
            </CardContent>
          </Card>

          {/* Default rest time */}
          <Card>
            <CardContent className="p-4">
              <p className="text-base font-medium mb-3">
                Tiempo de descanso por defecto
              </p>
              <ChipSelector
                options={[1, 2, 3]}
                value={settings.defaultRestTime}
                onChange={(v) => updateSetting("defaultRestTime", v)}
                renderLabel={(v) => `${v}min`}
              />
            </CardContent>
          </Card>

          {/* Confirm on finish */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-base font-medium">
                Confirmar al finalizar
              </span>
              <Switch
                checked={settings.confirmOnFinish}
                onCheckedChange={(v) => updateSetting("confirmOnFinish", v)}
              />
            </CardContent>
          </Card>

          {/* Export data */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-base font-medium">
                Exportar entrenamientos
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={exportToCSV}
                disabled={history.length === 0}
              >
                <Download className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>

          {/* Reset */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                Restablecer planificación
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto eliminará todos los ejercicios de tu planificación
                  semanal. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={resetPlan}>
                  Restablecer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}
