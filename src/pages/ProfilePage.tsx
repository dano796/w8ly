import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { useSettings } from "@/hooks/useSettings";
import { Profile, CompletedWorkout } from "@/utils/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  pageVariants,
  listContainerVariants,
  listItemVariants,
} from "@/utils/animations";
import { User, Calendar, Clock, Dumbbell, Edit2, Check, X } from "lucide-react";
import { defaultExercises } from "@/utils/exerciseData";

const exerciseMap = Object.fromEntries(defaultExercises.map((e) => [e.id, e]));

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useLocalStorage<Profile>("w8ly-profile", {
    name: "",
    email: "",
  });
  const { history } = useWorkoutHistory();
  const { settings } = useSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name || "Usuario");
  const [error, setError] = useState("");
  const [localHistory, setLocalHistory] = useState<CompletedWorkout[]>(history);

  // Update history when page becomes visible or when history prop changes
  useEffect(() => {
    setLocalHistory(history);
  }, [history]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Re-read from localStorage when page becomes visible
        try {
          const stored = window.localStorage.getItem("w8ly-workout-history");
          if (stored) {
            setLocalHistory(JSON.parse(stored));
          }
        } catch (e) {
          console.error("Error reading workout history:", e);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleSave = () => {
    if (!name.trim()) {
      setError("El nombre no puede estar vacío");
      return;
    }
    setError("");
    setProfile({ ...profile, name: name.trim() });
    setIsEditing(false);
    toast.success("Perfil actualizado");
  };

  const handleCancel = () => {
    setName(profile.name || "Usuario");
    setError("");
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} s`;
  };

  const getInitial = () => {
    return (profile.name || "U").charAt(0).toUpperCase();
  };

  const totalWorkouts = localHistory.length;
  const recentWorkouts = localHistory.slice(0, 10);

  return (
    <motion.div
      className="px-4 pt-6 pb-24 max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mb-3">
          <span className="text-3xl font-bold text-primary-foreground">
            {getInitial()}
          </span>
        </div>

        {isEditing ? (
          <div className="w-full max-w-xs space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="text-center"
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" className="flex-1" onClick={handleSave}>
                <Check className="w-4 h-4 mr-1" /> Guardar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{profile.name || "Usuario"}</h1>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats Card */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3">
          <Dumbbell className="w-8 h-8 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">
              Entrenamientos completados
            </p>
            <p className="text-2xl font-semibold">{totalWorkouts}</p>
          </div>
        </div>
      </Card>

      {/* Recent Workouts */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-3">Entrenamientos recientes</h2>
      </div>

      {recentWorkouts.length > 0 ? (
        <motion.div
          className="space-y-2"
          variants={listContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {recentWorkouts.map((workout, idx) => {
            const completedExercises = workout.exercises.filter((ex) =>
              ex.sets.some((s) => s.completed),
            ).length;
            const totalSets = workout.exercises.reduce(
              (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
              0,
            );

            return (
              <motion.div
                key={workout.id}
                variants={listItemVariants}
                onClick={() =>
                  navigate(`/summary/${workout.id}`, { state: workout })
                }
              >
                <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium">{workout.day}</h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {completedExercises} ejercicios
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(workout.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(workout.durationSeconds)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Series</p>
                      <p className="text-sm font-semibold">{totalSets}</p>
                    </div>
                  </div>

                  {/* Exercise preview */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {workout.exercises
                      .filter((ex) => ex.sets.some((s) => s.completed))
                      .slice(0, 3)
                      .map((ex, i) => {
                        const exerciseData = exerciseMap[ex.exerciseId];
                        return exerciseData ? (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {exerciseData.name}
                          </Badge>
                        ) : null;
                      })}
                    {completedExercises > 3 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{completedExercises - 3}
                      </Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <Card className="p-8 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Aún no has completado ningún entrenamiento
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            Ir al planificador
          </Button>
        </Card>
      )}
    </motion.div>
  );
}
