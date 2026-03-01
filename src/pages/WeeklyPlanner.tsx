import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useSettings } from "@/hooks/useSettings";
import { defaultExercises } from "@/utils/exerciseData";
import { DayName, DAYS } from "@/utils/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, MoreVertical, Play, GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const exerciseMap = Object.fromEntries(defaultExercises.map((e) => [e.id, e]));

export default function WeeklyPlannerPage() {
  const navigate = useNavigate();
  const { plan, removeExerciseFromDay, reorderExercises } = useWeeklyPlan();
  const { settings } = useSettings();
  const [dragItem, setDragItem] = useState<{
    day: DayName;
    idx: number;
  } | null>(null);

  // Recent exercises from plan
  const recentExercises = useMemo(() => {
    const seen = new Set<string>();
    const result: { exerciseId: string; name: string; muscleGroup: string }[] =
      [];
    for (const day of plan) {
      for (const ex of day.exercises) {
        if (!seen.has(ex.exerciseId)) {
          seen.add(ex.exerciseId);
          const data = exerciseMap[ex.exerciseId];
          if (data)
            result.push({
              exerciseId: ex.exerciseId,
              name: data.name,
              muscleGroup: data.muscleGroup,
            });
        }
        if (result.length >= 8) break;
      }
      if (result.length >= 8) break;
    }
    return result;
  }, [plan]);

  const handleDragStart = (day: DayName, idx: number) => {
    setDragItem({ day, idx });
  };

  const handleDrop = (targetDay: DayName, targetIdx: number) => {
    if (!dragItem) return;
    if (dragItem.day === targetDay) {
      const dayPlan = plan.find((d) => d.day === targetDay);
      if (!dayPlan) return;
      const exercises = [...dayPlan.exercises];
      const [moved] = exercises.splice(dragItem.idx, 1);
      exercises.splice(targetIdx, 0, moved);
      reorderExercises(targetDay, exercises);
    }
    setDragItem(null);
  };

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mi rutina semanal</h1>

      {/* Recent exercises */}
      {recentExercises.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Ejercicios recientes
            </h2>
            <button
              onClick={() => navigate("/exercises")}
              className="text-xs text-primary font-medium"
            >
              Ver todos
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {recentExercises.map((ex) => (
              <Card key={ex.exerciseId} className="flex-shrink-0 p-3 w-32">
                <p className="text-xs font-semibold truncate">{ex.name}</p>
                <Badge variant="secondary" className="text-[10px] mt-1">
                  {ex.muscleGroup}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Day columns */}
      <div className="space-y-4">
        {plan.map((dayPlan) => (
          <Card key={dayPlan.day} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-base">{dayPlan.day}</h3>
                <p className="text-xs text-muted-foreground">
                  {dayPlan.label || "Sin rutina"} · {dayPlan.exercises.length}{" "}
                  ejercicio{dayPlan.exercises.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {dayPlan.exercises.length > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 gap-1"
                    onClick={() => navigate(`/workout/${dayPlan.day}`)}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Iniciar
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => navigate(`/exercises?day=${dayPlan.day}`)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {dayPlan.exercises.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Agrega ejercicios con el botón +
              </p>
            ) : (
              <div className="space-y-2">
                {dayPlan.exercises.map((ex, idx) => {
                  const data = exerciseMap[ex.exerciseId];
                  if (!data) return null;
                  return (
                    <div
                      key={ex.id}
                      draggable
                      onDragStart={() => handleDragStart(dayPlan.day, idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(dayPlan.day, idx)}
                      className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
                      <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          IMG
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {data.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {data.muscleGroup}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {ex.sets}×{ex.reps}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              removeExerciseFromDay(dayPlan.day, ex.id)
                            }
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
