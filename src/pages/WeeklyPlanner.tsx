import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useSettings } from "@/hooks/useSettings";
import { defaultExercises } from "@/utils/exerciseData";
import { DayName, DAYS } from "@/utils/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Plus,
  MoreVertical,
  Play,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const exerciseMap = Object.fromEntries(defaultExercises.map((e) => [e.id, e]));

export default function WeeklyPlannerPage() {
  const navigate = useNavigate();
  const { plan, removeExerciseFromDay, reorderExercises, addExerciseToDay } =
    useWeeklyPlan();
  const { settings } = useSettings();
  const [dragItem, setDragItem] = useState<{
    day: DayName;
    idx: number;
  } | null>(null);
  const [draggedExercise, setDraggedExercise] = useState<{
    exerciseId: string;
    isFromCarousel: boolean;
  } | null>(null);
  const [isCarouselCollapsed, setIsCarouselCollapsed] = useState(false);

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
    setDraggedExercise(null);
  };

  const handleCarouselDragStart = (exerciseId: string) => {
    setDraggedExercise({ exerciseId, isFromCarousel: true });
    setDragItem(null);
  };

  const handleDrop = (targetDay: DayName, targetIdx: number) => {
    if (dragItem) {
      // Existing reorder logic within same day
      if (dragItem.day === targetDay) {
        const dayPlan = plan.find((d) => d.day === targetDay);
        if (!dayPlan) return;
        const exercises = [...dayPlan.exercises];
        const [moved] = exercises.splice(dragItem.idx, 1);
        exercises.splice(targetIdx, 0, moved);
        reorderExercises(targetDay, exercises);
      }
    }
    setDragItem(null);
    setDraggedExercise(null);
  };

  const handleDayDrop = (targetDay: DayName) => {
    if (draggedExercise?.isFromCarousel) {
      // Add exercise from carousel to day
      const newExercise = {
        id: `${targetDay}-${draggedExercise.exerciseId}-${Date.now()}`,
        exerciseId: draggedExercise.exerciseId,
        sets: settings.defaultSets,
        reps: 8, // Default reps
      };
      addExerciseToDay(targetDay, newExercise);
    }
    setDraggedExercise(null);
    setDragItem(null);
  };

  return (
    <div className="pt-6 pb-4 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <h1 className="text-2xl font-bold">Mi rutina semanal</h1>
      </div>

      {/* Day columns — horizontal Trello-style scroll */}
      <div
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory flex-1 px-4"
        style={{ scrollPaddingLeft: "1rem" }}
      >
        {plan.map((dayPlan, index) => (
          <Card
            key={dayPlan.day}
            className="flex-shrink-0 w-[80vw] max-w-[320px] p-4 flex flex-col snap-start h-fit max-h-[65vh]"
            onDragOver={(e) => {
              if (draggedExercise?.isFromCarousel) {
                e.preventDefault();
                e.currentTarget.classList.add("ring-2", "ring-primary");
              }
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove("ring-2", "ring-primary");
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("ring-2", "ring-primary");
              handleDayDrop(dayPlan.day);
            }}
          >
            {/* Day header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {dayPlan.day}
                  {dayPlan.label ? ` - ${dayPlan.label}` : ""}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dayPlan.exercises.length} ejercicio
                  {dayPlan.exercises.length !== 1 ? "s" : ""}
                </p>
              </div>
              {dayPlan.exercises.length > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => navigate(`/workout/${dayPlan.day}`)}
                >
                  <Play className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Exercise list — vertical scroll inside the card */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {dayPlan.exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Agrega ejercicios con el botón +
                </p>
              ) : (
                dayPlan.exercises.map((ex, idx) => {
                  const data = exerciseMap[ex.exerciseId];
                  if (!data) return null;
                  return (
                    <div
                      key={ex.id}
                      draggable
                      onDragStart={() => handleDragStart(dayPlan.day, idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(dayPlan.day, idx)}
                      className="flex items-start gap-3 p-3 bg-card rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          IMG
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-1">
                          {data.name}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1.5">
                          {ex.sets} series x {ex.reps} reps
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {data.muscleGroup}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                          >
                            <MoreVertical className="w-4 h-4" />
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
                })
              )}

              {/* Add exercise button at bottom of list */}
              <div className="flex justify-center pt-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-12 w-12 rounded-full"
                  onClick={() => navigate(`/exercises?day=${dayPlan.day}`)}
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent exercises carousel at bottom */}
      <div className="border-t mt-auto bg-background">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Ejercicios recientes</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsCarouselCollapsed(!isCarouselCollapsed)}
              >
                {isCarouselCollapsed ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
            <button
              onClick={() => navigate("/exercises")}
              className="text-sm text-primary font-medium hover:underline"
            >
              Ver todos
            </button>
          </div>

          {!isCarouselCollapsed && (
            <>
              {recentExercises.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {recentExercises.map((ex) => (
                    <Card
                      key={ex.exerciseId}
                      draggable
                      onDragStart={() => handleCarouselDragStart(ex.exerciseId)}
                      onDragEnd={() => setDraggedExercise(null)}
                      className="flex-shrink-0 p-3 w-36 hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div className="w-full h-20 bg-muted rounded-md flex items-center justify-center mb-2">
                        <span className="text-xs text-muted-foreground">
                          IMG
                        </span>
                      </div>
                      <p className="text-sm font-semibold truncate mb-1">
                        {ex.name}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {ex.muscleGroup}
                      </Badge>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Aún no tienes ejercicios en tu rutina
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/exercises")}
                  >
                    Explorar ejercicios
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}