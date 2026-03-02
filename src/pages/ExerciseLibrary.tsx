import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { defaultExercises } from "@/utils/exerciseData";
import { DayName, DAYS, MuscleGroup, Exercise } from "@/utils/types";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useSettings } from "@/hooks/useSettings";
import { useCustomExercises } from "@/hooks/useCustomExercises";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Plus,
  Check,
  Search,
  Dumbbell,
  Trash2,
  HelpCircle,
  X,
} from "lucide-react";
import { useExerciseTour } from "@/hooks/tours";
import ExerciseDetailSheet from "@/components/ExerciseDetailSheet";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
];

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const preselectedDay = searchParams.get("day") as DayName | null;
  const fromWorkout = searchParams.get("fromWorkout") as DayName | null;

  // Detecta el modo: "add" si viene de un workout o día, "browse" si navega la biblioteca
  const mode = fromWorkout || preselectedDay ? "add" : "browse";

  const { plan, addExerciseToDay, updateDayExercises } = useWeeklyPlan();
  const { settings } = useSettings();
  const { customExercises, addCustomExercise, removeCustomExercise } =
    useCustomExercises();
  const [activeFilter, setActiveFilter] = useState<MuscleGroup | "Todos">(
    "Todos",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] =
    useState<MuscleGroup>("Pecho");
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const observerRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(
    null,
  );

  // Get currently added exercises if coming from active workout
  const state = location.state as {
    currentExercises?: string[];
    startTime?: number;
  } | null;
  const currentExercises = new Set(state?.currentExercises || []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Combine default and custom exercises - memoized for performance
  const allExercises = useMemo(
    () => [...defaultExercises, ...customExercises],
    [customExercises],
  );

  const filtered = useMemo(
    () =>
      activeFilter === "Todos"
        ? allExercises
        : allExercises.filter((e) => e.muscleGroup === activeFilter),
    [activeFilter, allExercises],
  );

  const searchFiltered = useMemo(() => {
    if (!searchTerm.trim()) return filtered;

    const searchResults = filtered.filter((e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Priorizar ejercicios personalizados en los resultados de búsqueda
    return searchResults.sort((a, b) => {
      const aIsCustom = a.id.startsWith("custom-");
      const bIsCustom = b.id.startsWith("custom-");

      // Si uno es personalizado y el otro no, el personalizado va primero
      if (aIsCustom && !bIsCustom) return -1;
      if (!aIsCustom && bIsCustom) return 1;

      // Si ambos son del mismo tipo, mantener el orden original
      return 0;
    });
  }, [searchTerm, filtered]);

  // Limit visible exercises for performance
  const visibleExercises = searchFiltered.slice(0, visibleCount);
  const hasMore = searchFiltered.length > visibleCount;

  const { startTour } = useExerciseTour({
    ready: visibleExercises.length > 0,
    mode,
  });

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + 15, searchFiltered.length));
  }, [searchFiltered.length]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(15);
  }, [activeFilter, searchTerm]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const toggleSelection = (exerciseId: string) => {
    // Don't allow selection of exercises already in the workout
    if (currentExercises.has(exerciseId)) {
      toast.error("Este ejercicio ya está en el entrenamiento");
      return;
    }

    setSelectedExercises((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const handleAdd = (exerciseId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if exercise is already in the workout
    if (currentExercises.has(exerciseId)) {
      toast.error("Este ejercicio ya está en el entrenamiento");
      return;
    }

    if (fromWorkout) {
      // Add to active workout and go back immediately
      const state = location.state as { startTime?: number } | null;
      navigate(`/workout/${fromWorkout}`, {
        state: {
          addExercises: [exerciseId],
          startTime: state?.startTime,
        },
      });
    } else if (preselectedDay) {
      doAdd(exerciseId, preselectedDay);
      // Small delay to ensure state is saved to localStorage before navigation
      setTimeout(() => {
        navigate("/");
      }, 50);
    } else {
      setSelectedExerciseId(exerciseId);
      setSheetOpen(true);
    }
  };

  const handleAddSelected = () => {
    if (fromWorkout && selectedExercises.length > 0) {
      // Filter out exercises that are already in the workout
      const exercisesToAdd = selectedExercises.filter(
        (exerciseId) => !currentExercises.has(exerciseId),
      );

      if (exercisesToAdd.length === 0) {
        toast.error(
          "Todos los ejercicios seleccionados ya están en el entrenamiento",
        );
        setSelectedExercises([]);
        return;
      }

      if (exercisesToAdd.length < selectedExercises.length) {
        const duplicateCount = selectedExercises.length - exercisesToAdd.length;
        toast.warning(
          duplicateCount === 1
            ? "1 ejercicio ya está en el entrenamiento"
            : `${duplicateCount} ejercicios ya están en el entrenamiento`,
        );
      }

      const state = location.state as { startTime?: number } | null;
      navigate(`/workout/${fromWorkout}`, {
        state: {
          addExercises: exercisesToAdd,
          startTime: state?.startTime,
        },
      });
    } else if (preselectedDay && selectedExercises.length > 0) {
      // Add multiple exercises to the preselected day in a single operation
      const currentDayPlan = plan.find((d) => d.day === preselectedDay);

      if (currentDayPlan) {
        // Filter out exercises that already exist in the day
        const existingExerciseIds = new Set(
          currentDayPlan.exercises.map((ex) => ex.exerciseId),
        );
        const newExercisesToAdd = selectedExercises.filter(
          (exerciseId) => !existingExerciseIds.has(exerciseId),
        );

        if (newExercisesToAdd.length === 0) {
          toast.error(
            "Todos los ejercicios seleccionados ya existen en este día",
          );
          setSelectedExercises([]);
          setTimeout(() => {
            navigate("/");
          }, 50);
          return;
        }

        if (newExercisesToAdd.length < selectedExercises.length) {
          const skippedCount =
            selectedExercises.length - newExercisesToAdd.length;
          toast.warning(
            `Se omitieron ${skippedCount} ejercicio(s) duplicado(s)`,
          );
        }

        const newExercises = newExercisesToAdd.map((exerciseId, index) => ({
          id: `${preselectedDay}-${exerciseId}-${Date.now()}-${index}`,
          exerciseId,
          sets: settings.defaultSets,
          reps: 10,
        }));

        updateDayExercises(preselectedDay, [
          ...currentDayPlan.exercises,
          ...newExercises,
        ]);
      }

      setSelectedExercises([]);
      // Small delay to ensure state is saved to localStorage before navigation
      setTimeout(() => {
        navigate("/");
      }, 50);
    }
  };

  const doAdd = (exerciseId: string, day: DayName) => {
    // Check if exercise already exists in this day
    const dayPlan = plan.find((d) => d.day === day);
    const exerciseExists = dayPlan?.exercises.some(
      (ex) => ex.exerciseId === exerciseId,
    );

    if (exerciseExists) {
      toast.error("Este ejercicio ya existe en este día");
      setSheetOpen(false);
      setSelectedExerciseId(null);
      return;
    }

    addExerciseToDay(day, {
      id: `${day}-${exerciseId}-${Date.now()}`,
      exerciseId,
      sets: settings.defaultSets,
      reps: 10,
    });
    setSheetOpen(false);
    setSelectedExerciseId(null);
  };

  const handleCreateExercise = () => {
    if (!newExerciseName.trim()) {
      toast.error("El nombre del ejercicio es requerido");
      return;
    }

    const newExercise = addCustomExercise(
      newExerciseName.trim(),
      newExerciseMuscleGroup,
    );
    toast.success(`Ejercicio "${newExercise.name}" creado`);
    setNewExerciseName("");
    setNewExerciseMuscleGroup("Pecho");
    setCreateDialogOpen(false);
  };

  const handleDeleteExercise = (exercise: Exercise, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExerciseToDelete(exercise);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteExercise = () => {
    if (exerciseToDelete) {
      removeCustomExercise(exerciseToDelete.id);
      toast.success(`Ejercicio "${exerciseToDelete.name}" eliminado`);
      setDeleteDialogOpen(false);
      setExerciseToDelete(null);
    }
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
        <h1 className="text-2xl font-bold flex-1">Ejercicios</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={startTour}
          title="Ver tutorial"
        >
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
          data-tour="ex-create-btn"
        >
          <Dumbbell className="w-4 h-4" />
          Crear
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4" data-tour="ex-search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar ejercicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchTerm && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none"
            onClick={() => setSearchTerm("")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4"
        data-tour="ex-filters"
      >
        {filters.map((f, idx) => (
          <motion.button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-colors border",
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
        className="space-y-3 pb-24"
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {visibleExercises.map((ex, idx) => {
          const isSelected = selectedExercises.includes(ex.id);
          const isAlreadyAdded = currentExercises.has(ex.id);

          return (
            <motion.div key={ex.id} variants={listItemVariants}>
              <Card
                className={cn(
                  "flex items-center gap-3 p-4 transition-colors select-none",
                  (fromWorkout || preselectedDay) &&
                    !isAlreadyAdded &&
                    "cursor-pointer hover:bg-accent/50",
                  !fromWorkout &&
                    !preselectedDay &&
                    "cursor-pointer hover:bg-accent/50",
                  isSelected && "bg-primary/10 border-primary",
                  isAlreadyAdded && "opacity-60 cursor-not-allowed",
                )}
                onClick={() => {
                  if (fromWorkout || preselectedDay) {
                    if (!isAlreadyAdded) {
                      toggleSelection(ex.id);
                    }
                  } else {
                    // View exercise detail
                    setDetailExercise(ex);
                    setDetailSheetOpen(true);
                  }
                }}
                id={idx === 0 ? "tour-ex-card-0" : undefined}
              >
                <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {ex.imageUrl ? (
                    <img
                      src={ex.imageUrl}
                      alt={ex.name}
                      className="w-full h-full object-cover pointer-events-none"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <Dumbbell className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate">{ex.name}</p>
                  <div className="flex gap-1.5 items-center mt-1">
                    <Badge variant="secondary" className="text-sm">
                      {ex.muscleGroup}
                    </Badge>
                    {isAlreadyAdded && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-primary/10 text-primary border-primary"
                      >
                        Ya agregado
                      </Badge>
                    )}
                  </div>
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
                      disabled={isAlreadyAdded}
                      id={idx === 0 ? "tour-ex-add-btn-0" : undefined}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-1">
                    {ex.id.startsWith("custom-") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteExercise(ex, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => handleAdd(ex.id, e)}
                      id={idx === 0 ? "tour-ex-add-btn-0" : undefined}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div
            ref={observerRef}
            className="h-10 flex items-center justify-center"
          >
            <div className="text-sm text-muted-foreground animate-pulse">
              Cargando más ejercicios...
            </div>
          </div>
        )}
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
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSelectedExerciseId(null);
          }
        }}
      >
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
              variant="outline"
              className="col-span-2 mt-2"
              onClick={() => {
                setSheetOpen(false);
                setSelectedExerciseId(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create exercise dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-[425px] w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Crear ejercicio personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exercise-name">Nombre del ejercicio *</Label>
              <Input
                id="exercise-name"
                placeholder="Ej: Press banca inclinado"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateExercise();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="muscle-group">Grupo muscular</Label>
              <Select
                value={newExerciseMuscleGroup}
                onValueChange={(value) =>
                  setNewExerciseMuscleGroup(value as MuscleGroup)
                }
              >
                <SelectTrigger id="muscle-group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pecho">Pecho</SelectItem>
                  <SelectItem value="Espalda">Espalda</SelectItem>
                  <SelectItem value="Pierna">Pierna</SelectItem>
                  <SelectItem value="Brazos">Brazos</SelectItem>
                  <SelectItem value="Hombros">Hombros</SelectItem>
                  <SelectItem value="Core">Core</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleCreateExercise} className="w-full m-0">
              Crear ejercicio
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewExerciseName("");
                setNewExerciseMuscleGroup("Pecho");
              }}
              className="w-full m-0"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        exercise={detailExercise}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onDelete={handleDeleteExercise}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[425px] w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ejercicio?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar "{exerciseToDelete?.name}"?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              onClick={confirmDeleteExercise}
              className="w-full m-0 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
            <AlertDialogCancel className="w-full m-0">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
