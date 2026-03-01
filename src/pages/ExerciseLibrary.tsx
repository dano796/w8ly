import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { defaultExercises } from "@/utils/exerciseData";
import { DayName, DAYS, MuscleGroup } from "@/utils/types";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useSettings } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const filters: (MuscleGroup | "Todos")[] = [
  "Todos",
  "Pecho",
  "Espalda",
  "Pierna",
  "Brazos",
  "Hombros",
  "Core",
];

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedDay = searchParams.get("day") as DayName | null;

  const { addExerciseToDay } = useWeeklyPlan();
  const { settings } = useSettings();
  const [activeFilter, setActiveFilter] = useState<MuscleGroup | "Todos">(
    "Todos",
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );

  const filtered =
    activeFilter === "Todos"
      ? defaultExercises
      : defaultExercises.filter((e) => e.muscleGroup === activeFilter);

  const handleAdd = (exerciseId: string) => {
    if (preselectedDay) {
      doAdd(exerciseId, preselectedDay);
    } else {
      setSelectedExerciseId(exerciseId);
      setSheetOpen(true);
    }
  };

  const doAdd = (exerciseId: string, day: DayName) => {
    addExerciseToDay(day, {
      id: `${exerciseId}-${Date.now()}`,
      exerciseId,
      sets: settings.defaultSets,
      reps: 10,
    });
    setSheetOpen(false);
    setSelectedExerciseId(null);
  };

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Ejercicios</h1>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
              activeFilter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-2">
        {filtered.map((ex) => (
          <Card key={ex.id} className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-muted-foreground">IMG</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{ex.name}</p>
              <Badge variant="secondary" className="text-[10px] mt-0.5">
                {ex.muscleGroup}
              </Badge>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => handleAdd(ex.id)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>

      {/* Day selection sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Agregar a un día</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4 pb-4">
            {DAYS.map((day) => (
              <Button
                key={day}
                variant="outline"
                onClick={() =>
                  selectedExerciseId && doAdd(selectedExerciseId, day)
                }
                className="h-11"
              >
                {day}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="col-span-2"
              onClick={() => setSheetOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
