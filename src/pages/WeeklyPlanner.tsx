import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { useSettings } from "@/hooks/useSettings";
import { useCustomExercises } from "@/hooks/useCustomExercises";
import { defaultExercises } from "@/utils/exerciseData";
import { DayName, DAYS, Exercise } from "@/utils/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ExerciseDetailSheet from "@/components/ExerciseDetailSheet";
import {
  Plus,
  MoreVertical,
  Play,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Edit2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  pageVariants,
  listItemVariants,
  tapAnimation,
} from "@/utils/animations";

export default function WeeklyPlannerPage() {
  const navigate = useNavigate();
  const { customExercises } = useCustomExercises();

  // Combine default and custom exercises
  const allExercises = useMemo(
    () => [...defaultExercises, ...customExercises],
    [customExercises],
  );
  const exerciseMap = useMemo(
    () => Object.fromEntries(allExercises.map((e) => [e.id, e])),
    [allExercises],
  );

  const {
    plan,
    removeExerciseFromDay,
    reorderExercises,
    addExerciseToDay,
    updateDayLabel,
    moveExercise,
  } = useWeeklyPlan();
  const { settings } = useSettings();
  const [dragItem, setDragItem] = useState<{
    day: DayName;
    idx: number;
    exerciseId: string;
  } | null>(null);
  const [draggedExercise, setDraggedExercise] = useState<{
    exerciseId: string;
    isFromCarousel: boolean;
    sourceDay?: DayName;
    sourceIdx?: number;
    sourceExId?: string;
  } | null>(null);
  const [isCarouselCollapsed, setIsCarouselCollapsed] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [touchCurrentPos, setTouchCurrentPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayName | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [editLabelDialog, setEditLabelDialog] = useState<{
    isOpen: boolean;
    day: DayName | null;
    currentLabel: string;
  }>({ isOpen: false, day: null, currentLabel: "" });
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const lastTouchXRef = useRef<number>(0);

  // Auto-scroll when dragging near edges
  const handleAutoScroll = () => {
    const container = scrollContainerRef.current;
    const clientX = lastTouchXRef.current;

    if (!container || !draggedExercise) {
      if (autoScrollFrameRef.current) {
        cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const edgeThreshold = 120; // Distance from viewport edge to trigger scroll
    const maxScrollSpeed = 20; // Maximum pixels to scroll per frame

    let scrollSpeed = 0;

    // Check if near left edge of viewport
    const distanceFromLeft = clientX;
    if (distanceFromLeft > 0 && distanceFromLeft < edgeThreshold) {
      // Closer to edge = faster scroll
      const intensity = 1 - distanceFromLeft / edgeThreshold;
      scrollSpeed = -maxScrollSpeed * intensity;
    }
    // Check if near right edge of viewport
    else {
      const distanceFromRight = viewportWidth - clientX;
      if (distanceFromRight > 0 && distanceFromRight < edgeThreshold) {
        const intensity = 1 - distanceFromRight / edgeThreshold;
        scrollSpeed = maxScrollSpeed * intensity;
      }
    }

    // Apply scroll and continue if needed
    if (Math.abs(scrollSpeed) > 0.5) {
      container.scrollLeft += scrollSpeed;
    }

    // Always continue loop while dragging
    autoScrollFrameRef.current = requestAnimationFrame(handleAutoScroll);
  };

  // Cleanup auto-scroll on unmount
  useEffect(() => {
    return () => {
      if (autoScrollFrameRef.current) {
        cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
    };
  }, []);

  // Recent exercises from plan - limited to 5 for performance
  const recentExercises = useMemo(() => {
    const seen = new Set<string>();
    const result: {
      exerciseId: string;
      name: string;
      muscleGroup: string;
      imageUrl?: string;
    }[] = [];
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
              imageUrl: data.imageUrl,
            });
        }
        if (result.length >= 5) break;
      }
      if (result.length >= 5) break;
    }
    return result;
  }, [plan, exerciseMap]);

  const handleDragStart = (day: DayName, idx: number, exerciseId: string) => {
    setDragItem({ day, idx, exerciseId });
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

  const handleDayDrop = (targetDay: DayName): boolean => {
    if (draggedExercise?.isFromCarousel) {
      // Check if exercise already exists in this day
      const targetDayPlan = plan.find((d) => d.day === targetDay);
      const exerciseExists = targetDayPlan?.exercises.some(
        (ex) => ex.exerciseId === draggedExercise.exerciseId,
      );

      if (exerciseExists) {
        toast.error("Este ejercicio ya existe en este día");
        setDraggedExercise(null);
        setDragItem(null);
        return false;
      }

      // Add exercise from carousel to day
      const newExercise = {
        id: `${targetDay}-${draggedExercise.exerciseId}-${Date.now()}`,
        exerciseId: draggedExercise.exerciseId,
        sets: settings.defaultSets,
        reps: 8, // Default reps
      };
      addExerciseToDay(targetDay, newExercise);
      setDraggedExercise(null);
      setDragItem(null);
      return true;
    } else if (dragItem && dragItem.day !== targetDay) {
      // Move exercise from one day to another
      const sourceDayPlan = plan.find((d) => d.day === dragItem.day);
      const sourceExercise = sourceDayPlan?.exercises[dragItem.idx];

      if (sourceExercise) {
        const moved = moveExercise(dragItem.day, targetDay, sourceExercise.id);
        if (moved) {
          toast.success(`Ejercicio movido a ${targetDay}`);
        } else {
          toast.error("Este ejercicio ya existe en este día");
        }
      }
    }
    setDraggedExercise(null);
    setDragItem(null);
    return false;
  };

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, exerciseId: string) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    lastTouchXRef.current = touch.clientX;

    // Long press to initiate drag
    const timer = setTimeout(() => {
      setDraggedExercise({ exerciseId, isFromCarousel: true });
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 400); // 400ms long press for better distinction from scroll

    setLongPressTimer(timer);
  };

  const handleDayExerciseTouchStart = (
    e: React.TouchEvent,
    day: DayName,
    idx: number,
    exerciseId: string,
    exId: string,
  ) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    lastTouchXRef.current = touch.clientX;

    // Long press to initiate drag
    const timer = setTimeout(() => {
      setDraggedExercise({
        exerciseId,
        isFromCarousel: false,
        sourceDay: day,
        sourceIdx: idx,
        sourceExId: exId,
      });
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 400); // 400ms long press

    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];

    if (touchStartPos) {
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);

      // If moved vertically before long press completes, cancel it (user is scrolling)
      if (deltaY > 10 && longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        setTouchStartPos(null);
        return; // Allow native scroll to continue
      }

      // Also cancel if moved too much horizontally
      if (deltaX > 15 && longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        setTouchStartPos(null);
        return;
      }
    }

    // If drag is active, update position and detect target
    if (draggedExercise) {
      // Prevent default scrolling only when actively dragging
      e.preventDefault();
      setTouchCurrentPos({ x: touch.clientX, y: touch.clientY });
      lastTouchXRef.current = touch.clientX;

      // Find which day card is under the touch point
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const dayCard = element?.closest("[data-day]");

      if (dayCard) {
        const day = dayCard.getAttribute("data-day") as DayName;
        setHoveredDay(day);
      } else {
        setHoveredDay(null);
      }

      // Ensure auto-scroll is running
      if (!autoScrollFrameRef.current) {
        handleAutoScroll();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // Stop auto-scroll
    if (autoScrollFrameRef.current) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }

    if (draggedExercise) {
      // Use the hovered day if available
      if (hoveredDay) {
        if (draggedExercise.isFromCarousel) {
          const success = handleDayDrop(hoveredDay);
          if (success) {
            toast.success(`Ejercicio añadido a ${hoveredDay}`);
          }
        } else if (
          draggedExercise.sourceDay &&
          draggedExercise.sourceDay !== hoveredDay
        ) {
          // Move exercise between days
          const sourceDayPlan = plan.find(
            (d) => d.day === draggedExercise.sourceDay,
          );
          const sourceExercise =
            sourceDayPlan?.exercises[draggedExercise.sourceIdx!];
          if (sourceExercise) {
            const moved = moveExercise(
              draggedExercise.sourceDay,
              hoveredDay,
              sourceExercise.id,
            );
            if (moved) {
              toast.success(`Ejercicio movido a ${hoveredDay}`);
            } else {
              toast.error("Este ejercicio ya existe en este día");
            }
          }
        }
      }
    }

    setTouchStartPos(null);
    setTouchCurrentPos(null);
    setHoveredDay(null);
    setDraggedExercise(null);
  };

  const handleOpenEditLabel = (day: DayName, currentLabel: string) => {
    setEditLabelDialog({ isOpen: true, day, currentLabel });
  };

  const handleSaveLabel = () => {
    if (editLabelDialog.day) {
      updateDayLabel(editLabelDialog.day, editLabelDialog.currentLabel.trim());
      setEditLabelDialog({ isOpen: false, day: null, currentLabel: "" });
      toast.success("Título actualizado");
    }
  };

  const handleClearLabel = () => {
    if (editLabelDialog.day) {
      updateDayLabel(editLabelDialog.day, "");
      setEditLabelDialog({ isOpen: false, day: null, currentLabel: "" });
      toast.success("Título eliminado");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        paddingBottom: "calc(5rem + max(env(safe-area-inset-bottom), 0px))",
      }}
    >
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 bg-background border-b pt-6 pb-4 px-4 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mi rutina semanal</h1>
        </div>
      </div>

      {/* Day columns — horizontal Trello-style scroll */}
      <div
        ref={scrollContainerRef}
        className={`flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-hide py-4 flex-1 px-4 min-h-0 ${
          draggedExercise ? "" : "snap-x snap-mandatory"
        }`}
        style={{
          scrollPaddingLeft: "1rem",
          WebkitOverflowScrolling: "touch",
          scrollBehavior: draggedExercise ? "auto" : "smooth",
        }}
      >
        {plan.map((dayPlan, index) => (
          <motion.div
            key={dayPlan.day}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="flex-shrink-0 w-[80vw] max-w-[320px] snap-start h-full"
          >
            <Card
              data-day={dayPlan.day}
              className={`p-4 flex flex-col h-full transition-all ${
                hoveredDay === dayPlan.day
                  ? "ring-4 ring-primary bg-primary/10 scale-[1.02]"
                  : draggedExercise &&
                      (draggedExercise.isFromCarousel ||
                        draggedExercise.sourceDay !== dayPlan.day)
                    ? "ring-2 ring-primary/30"
                    : ""
              }`}
              onDragOver={(e) => {
                if (
                  draggedExercise?.isFromCarousel ||
                  (dragItem && dragItem.day !== dayPlan.day)
                ) {
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
                const success = handleDayDrop(dayPlan.day);
                if (success && draggedExercise?.isFromCarousel) {
                  toast.success(`Ejercicio añadido a ${dayPlan.day}`);
                }
              }}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-lg truncate">
                      {dayPlan.day}
                      {dayPlan.label && (
                        <span className="text-primary"> - {dayPlan.label}</span>
                      )}
                    </h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() =>
                        handleOpenEditLabel(dayPlan.day, dayPlan.label)
                      }
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-base text-muted-foreground">
                    {dayPlan.exercises.length} ejercicio
                    {dayPlan.exercises.length !== 1 ? "s" : ""}
                  </p>
                </div>
                {dayPlan.exercises.length > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 flex-shrink-0 min-w-[44px] min-h-[44px]"
                    onClick={() => navigate(`/workout/${dayPlan.day}`)}
                  >
                    <Play className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Exercise list — vertical scroll inside the card */}
              <div
                className="flex-1 overflow-y-auto space-y-3"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {dayPlan.exercises.length === 0 ? (
                  <p className="text-base text-muted-foreground text-center py-8">
                    Agrega ejercicios con el botón +
                  </p>
                ) : (
                  dayPlan.exercises.map((ex, idx) => {
                    const data = exerciseMap[ex.exerciseId];
                    if (!data) return null;
                    return (
                      <div
                        key={ex.id}
                        draggable={false}
                        onTouchStart={(e) =>
                          handleDayExerciseTouchStart(
                            e,
                            dayPlan.day,
                            idx,
                            ex.exerciseId,
                            ex.id,
                          )
                        }
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`flex items-start gap-3 p-2.5 bg-card rounded-lg border hover:bg-accent/50 transition-colors touch-draggable ${
                          draggedExercise?.sourceExId === ex.id
                            ? "opacity-50"
                            : ""
                        }`}
                        style={{
                          touchAction:
                            draggedExercise?.sourceExId === ex.id
                              ? "none"
                              : "pan-y",
                        }}
                      >
                        <div
                          className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailExercise(data);
                            setDetailSheetOpen(true);
                          }}
                        >
                          {data?.imageUrl ? (
                            <img
                              src={data.imageUrl}
                              alt={data.name}
                              className="w-full h-full object-cover pointer-events-none"
                              loading="lazy"
                              draggable={false}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              IMG
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-base font-semibold mb-1 cursor-pointer hover:text-primary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailExercise(data);
                              setDetailSheetOpen(true);
                            }}
                          >
                            {data.name}
                          </p>
                          <p className="text-sm text-muted-foreground mb-1.5">
                            {ex.sets} series x {ex.reps} reps
                          </p>
                          <Badge variant="secondary" className="text-sm">
                            {data.muscleGroup}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 flex-shrink-0 min-w-[44px] min-h-[44px]"
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
          </motion.div>
        ))}
      </div>

      {/* Recent exercises carousel at bottom - Fixed above navigation */}
      <div className="flex-shrink-0 border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-20">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Ejercicios recientes</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 min-w-[44px] min-h-[44px]"
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
              className="text-sm text-primary font-medium hover:underline min-h-[44px] px-2 flex items-center"
            >
              Ver todos
            </button>
          </div>

          {!isCarouselCollapsed && (
            <>
              {recentExercises.length > 0 ? (
                <div
                  ref={carouselRef}
                  className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
                  style={{
                    WebkitOverflowScrolling: "touch",
                    scrollBehavior: "smooth",
                  }}
                >
                  {recentExercises.map((ex, idx) => (
                    <motion.div
                      key={ex.exerciseId}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: idx * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-shrink-0"
                    >
                      <Card
                        draggable={false}
                        onTouchStart={(e) => handleTouchStart(e, ex.exerciseId)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`p-3 w-36 hover:bg-accent transition-all touch-draggable ${
                          draggedExercise?.exerciseId === ex.exerciseId
                            ? "opacity-50 scale-95 shadow-lg"
                            : "cursor-grab active:cursor-grabbing"
                        }`}
                        style={{
                          touchAction:
                            draggedExercise?.exerciseId === ex.exerciseId
                              ? "none"
                              : "pan-x",
                        }}
                      >
                        <div
                          className="w-full h-20 bg-muted rounded-md flex items-center justify-center mb-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailExercise(
                              allExercises.find(
                                (exercise) => exercise.id === ex.exerciseId,
                              ) || null,
                            );
                            setDetailSheetOpen(true);
                          }}
                        >
                          {ex.imageUrl ? (
                            <img
                              src={ex.imageUrl}
                              alt={ex.name}
                              className="w-full h-full object-cover pointer-events-none"
                              loading="lazy"
                              draggable={false}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              IMG
                            </span>
                          )}
                        </div>
                        <p
                          className="text-base font-semibold truncate mb-1 cursor-pointer hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailExercise(
                              allExercises.find(
                                (exercise) => exercise.id === ex.exerciseId,
                              ) || null,
                            );
                            setDetailSheetOpen(true);
                          }}
                        >
                          {ex.name}
                        </p>
                        <Badge variant="secondary" className="text-sm">
                          {ex.muscleGroup}
                        </Badge>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4">
                  <p className="text-base text-muted-foreground mb-3">
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

      {/* Edit Label Dialog */}
      <Dialog
        open={editLabelDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditLabelDialog({ isOpen: false, day: null, currentLabel: "" });
          }
        }}
      >
        <DialogContent className="max-w-[425px] w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Editar título de la rutina</DialogTitle>
            <DialogDescription>
              Dale un nombre personalizado a tu rutina del {editLabelDialog.day}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="label">Título (opcional)</Label>
            <Input
              id="label"
              value={editLabelDialog.currentLabel}
              onChange={(e) =>
                setEditLabelDialog({
                  ...editLabelDialog,
                  currentLabel: e.target.value,
                })
              }
              placeholder="Ej: Torso A, Pierna, Pull..."
              maxLength={30}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveLabel();
                }
              }}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleSaveLabel} className="w-full m-0">
              Guardar
            </Button>
            {editLabelDialog.currentLabel && (
              <Button
                variant="destructive"
                onClick={handleClearLabel}
                className="w-full m-0"
              >
                Eliminar título
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                setEditLabelDialog({
                  isOpen: false,
                  day: null,
                  currentLabel: "",
                })
              }
              className="w-full m-0"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drag ghost element that follows finger */}
      <AnimatePresence>
        {draggedExercise && touchCurrentPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed pointer-events-none z-50"
            style={{
              left: touchCurrentPos.x - 70,
              top: touchCurrentPos.y - 70,
            }}
          >
            <Card className="p-3 w-36 shadow-2xl border-2 border-primary bg-background/95 backdrop-blur-sm select-none">
              <div className="w-full h-20 bg-muted rounded-md flex items-center justify-center mb-2 overflow-hidden">
                {exerciseMap[draggedExercise.exerciseId]?.imageUrl ? (
                  <img
                    src={exerciseMap[draggedExercise.exerciseId].imageUrl}
                    alt={exerciseMap[draggedExercise.exerciseId]?.name}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">IMG</span>
                )}
              </div>
              <p className="text-sm font-semibold truncate mb-1">
                {exerciseMap[draggedExercise.exerciseId]?.name}
              </p>
              <Badge variant="secondary" className="text-xs">
                {exerciseMap[draggedExercise.exerciseId]?.muscleGroup}
              </Badge>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        exercise={detailExercise}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </motion.div>
  );
}
