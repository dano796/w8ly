import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { defaultExercises } from "@/utils/exerciseData";
import { DayName, DAYS, MuscleGroup } from "@/utils/types";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useSettings } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Check, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  pageVariants,
  listContainerVariants,
  listItemVariants,
  tapAnimation,
} from "@/utils/animations";

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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedDay = searchParams.get("day") as DayName | null;
  const fromWorkout = searchParams.get("fromWorkout") as DayName | null;

  const { addExerciseToDay } = useWeeklyPlan();
  const { settings } = useSettings();
  const [activeFilter, setActiveFilter] = useState<MuscleGroup | "Todos">(
    "Todos",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const filtered =
    activeFilter === "Todos"
      ? defaultExercises
      : defaultExercises.filter((e) => e.muscleGroup === activeFilter);

  const searchFiltered = searchTerm.trim()
    ? filtered.filter((e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    : filtered;

  const toggleSelection = (exerciseId: string) => {
    setSelectedExercises((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const handleAdd = (exerciseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (preselectedDay) {
      doAdd(exerciseId, preselectedDay);
      navigate("/");
    } else {
      setSelectedExerciseId(exerciseId);
      setSheetOpen(true);
    }
  };

  const handleAddSelected = () => {
    if (fromWorkout && selectedExercises.length > 0) {
      const state = location.state as { startTime?: number } | null;
      navigate(`/workout/${fromWorkout}`, {
        state: {
          addExercises: selectedExercises,
          startTime: state?.startTime,
        },
      });
    } else if (preselectedDay && selectedExercises.length > 0) {
      // Add multiple exercises to the preselected day
      selectedExercises.forEach((exerciseId) => {
        doAdd(exerciseId, preselectedDay);
      });
      setSelectedExercises([]);
      navigate("/");
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
    <motion.div
      className="px-4 pt-6 max-w-lg mx-auto"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Ejercicios</h1>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar ejercicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
        {filters.map((f, idx) => (
          <motion.button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
              activeFilter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border",
            )}
            whileTap={tapAnimation}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            {f}
          </motion.button>
        ))}
      </div>

      {/* Exercise list */}
      <motion.div
        className="space-y-2 pb-24"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {searchFiltered.map((ex) => {
          const isSelected = selectedExercises.includes(ex.id);
          return (
            <motion.div key={ex.id} variants={listItemVariants}>
              <Card
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                  (fromWorkout || preselectedDay) && "hover:bg-accent/50",
                  isSelected && "bg-primary/10 border-primary",
                )}
                onClick={() =>
                  fromWorkout || preselectedDay ? toggleSelection(ex.id) : null
                }
              >
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">IMG</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{ex.name}</p>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">
                    {ex.muscleGroup}
                  </Badge>
                </div>
                {fromWorkout || preselectedDay ? (
                  <>
                    {isSelected && (
                      <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => handleAdd(ex.id, e)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => handleAdd(ex.id, e)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Floating button for multi-select */}
      {(fromWorkout || preselectedDay) && selectedExercises.length > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          style={{
            paddingBottom: "calc(1rem + max(env(safe-area-inset-bottom), 0px))",
          }}
        >
          <Button
            className="w-full max-w-lg mx-auto h-12"
            onClick={handleAddSelected}
          >
            Agregar {selectedExercises.length}{" "}
            {selectedExercises.length === 1 ? "ejercicio" : "ejercicios"}
          </Button>
        </motion.div>
      )}

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
                onClick={() => {
                  if (selectedExerciseId) {
                    doAdd(selectedExerciseId, day);
                    navigate("/");
                  }
                }}
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
    </motion.div>
  );
}