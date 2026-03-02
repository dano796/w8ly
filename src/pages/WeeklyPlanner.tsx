import { usePlannerTour } from "@/hooks/tours";
import { HelpCircle } from "lucide-react";
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
  ChevronDown,
  ChevronUp,
  Edit2,
  Info,
  Layers,
  ArrowLeftRight,
  Copy,
  Trash2,
  Minus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  pageVariants,
  listItemVariants,
  tapAnimation,
} from "@/utils/animations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditExDialog {
  isOpen: boolean;
  day: DayName | null;
  exId: string | null;
  exName: string;
  sets: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeeklyPlannerPage() {
  const navigate = useNavigate();
  const { customExercises } = useCustomExercises();

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

  // ── Drag state ──────────────────────────────────────────────────────────────
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

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isCarouselCollapsed, setIsCarouselCollapsed] = useState(false);
  const [editLabelDialog, setEditLabelDialog] = useState<{
    isOpen: boolean;
    day: DayName | null;
    currentLabel: string;
  }>({ isOpen: false, day: null, currentLabel: "" });
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // ── Edit sets dialog ───────────────────────────────────────────────────────
  const [editExDialog, setEditExDialog] = useState<EditExDialog>({
    isOpen: false,
    day: null,
    exId: null,
    exName: "",
    sets: 3,
  });

  // ── Move/copy day picker dialog ─────────────────────────────────────────────
  const [dayPickerDialog, setDayPickerDialog] = useState<{
    isOpen: boolean;
    mode: "move" | "copy";
    sourceDay: DayName | null;
    exId: string | null;
    exerciseId: string | null;
    exName: string;
    sets: number;
    reps: number;
  }>({
    isOpen: false,
    mode: "move",
    sourceDay: null,
    exId: null,
    exerciseId: null,
    exName: "",
    sets: 3,
    reps: 10,
  });

  const openDayPicker = (
    mode: "move" | "copy",
    sourceDay: DayName,
    exId: string,
    exerciseId: string,
    exName: string,
    sets: number,
    reps: number,
  ) => {
    setDayPickerDialog({
      isOpen: true,
      mode,
      sourceDay,
      exId,
      exerciseId,
      exName,
      sets,
      reps,
    });
  };

  const closeDayPicker = () => {
    setDayPickerDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const openEditExDialog = (
    day: DayName,
    exId: string,
    exName: string,
    sets: number,
  ) => {
    setEditExDialog({ isOpen: true, day, exId, exName, sets });
  };

  const closeEditExDialog = () => {
    setEditExDialog((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSaveEditEx = () => {
    const { day, exId, sets } = editExDialog;
    if (!day || !exId) return;

    const dayPlan = plan.find((d) => d.day === day);
    if (!dayPlan) return;

    const updatedExercises = dayPlan.exercises.map((e) =>
      e.id === exId ? { ...e, sets } : e,
    );
    reorderExercises(day, updatedExercises);
    toast.success("Ejercicio actualizado");
    closeEditExDialog();
  };

  const adjustValue = (
    field: "sets",
    delta: number,
    min: number,
    max: number,
  ) => {
    setEditExDialog((prev) => ({
      ...prev,
      [field]: Math.min(max, Math.max(min, prev[field] + delta)),
    }));
  };

  // ── Refs ────────────────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const lastTouchXRef = useRef<number>(0);

  // ── Tour ────────────────────────────────────────────────────────────────────
  const lunesExercises = plan.find((d) => d.day === "Lunes")?.exercises ?? [];
  const { startTour } = usePlannerTour({
    ready: plan.length > 0,
    setCarouselCollapsed: setIsCarouselCollapsed,
    lundayExercises: lunesExercises,
    addExerciseToLunes: (exercise) => addExerciseToDay("Lunes", exercise),
    removeSeedFromLunes: (instanceId) =>
      removeExerciseFromDay("Lunes", instanceId),
  });

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
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
    const viewportWidth = window.innerWidth;
    const edgeThreshold = 120;
    const maxScrollSpeed = 20;
    let scrollSpeed = 0;
    const distanceFromLeft = clientX;
    if (distanceFromLeft > 0 && distanceFromLeft < edgeThreshold) {
      scrollSpeed = -maxScrollSpeed * (1 - distanceFromLeft / edgeThreshold);
    } else {
      const distanceFromRight = viewportWidth - clientX;
      if (distanceFromRight > 0 && distanceFromRight < edgeThreshold) {
        scrollSpeed = maxScrollSpeed * (1 - distanceFromRight / edgeThreshold);
      }
    }
    if (Math.abs(scrollSpeed) > 0.5) container.scrollLeft += scrollSpeed;
    autoScrollFrameRef.current = requestAnimationFrame(handleAutoScroll);
  };

  useEffect(() => {
    return () => {
      if (autoScrollFrameRef.current) {
        cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
    };
  }, []);

  // Native touchmove listener with { passive: false } so preventDefault works
  // during drag. React's synthetic onTouchMove uses passive listeners by default,
  // which silently ignores preventDefault and logs the console warning.
  const draggedExerciseRef = useRef(draggedExercise);
  useEffect(() => {
    draggedExerciseRef.current = draggedExercise;
  }, [draggedExercise]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (draggedExerciseRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  // ── Recent exercises ────────────────────────────────────────────────────────
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

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const handleDragStart = (day: DayName, idx: number, exerciseId: string) => {
    setDragItem({ day, idx, exerciseId });
    setDraggedExercise(null);
  };

  const handleCarouselDragStart = (exerciseId: string) => {
    setDraggedExercise({ exerciseId, isFromCarousel: true });
    setDragItem(null);
  };

  const handleDrop = (targetDay: DayName, targetIdx: number) => {
    if (dragItem?.day === targetDay) {
      const dayPlan = plan.find((d) => d.day === targetDay);
      if (!dayPlan) return;
      const exercises = [...dayPlan.exercises];
      const [moved] = exercises.splice(dragItem.idx, 1);
      exercises.splice(targetIdx, 0, moved);
      reorderExercises(targetDay, exercises);
    }
    setDragItem(null);
    setDraggedExercise(null);
  };

  const handleDayDrop = (targetDay: DayName): boolean => {
    if (draggedExercise?.isFromCarousel) {
      const targetDayPlan = plan.find((d) => d.day === targetDay);
      if (
        targetDayPlan?.exercises.some(
          (ex) => ex.exerciseId === draggedExercise.exerciseId,
        )
      ) {
        toast.error("Este ejercicio ya existe en este día");
        setDraggedExercise(null);
        setDragItem(null);
        return false;
      }
      addExerciseToDay(targetDay, {
        id: `${targetDay}-${draggedExercise.exerciseId}-${Date.now()}`,
        exerciseId: draggedExercise.exerciseId,
        sets: settings.defaultSets,
        reps: 8,
      });
      setDraggedExercise(null);
      setDragItem(null);
      return true;
    } else if (dragItem && dragItem.day !== targetDay) {
      const sourceDayPlan = plan.find((d) => d.day === dragItem.day);
      const sourceExercise = sourceDayPlan?.exercises[dragItem.idx];
      if (sourceExercise) {
        const moved = moveExercise(dragItem.day, targetDay, sourceExercise.id);
        if (moved) toast.success(`Ejercicio movido a ${targetDay}`);
        else toast.error("Este ejercicio ya existe en este día");
      }
    }
    setDraggedExercise(null);
    setDragItem(null);
    return false;
  };

  const handleTouchStart = (e: React.TouchEvent, exerciseId: string) => {
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    lastTouchXRef.current = touch.clientX;
    const timer = setTimeout(() => {
      setDraggedExercise({ exerciseId, isFromCarousel: true });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400);
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
    const timer = setTimeout(() => {
      setDraggedExercise({
        exerciseId,
        isFromCarousel: false,
        sourceDay: day,
        sourceIdx: idx,
        sourceExId: exId,
      });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touchStartPos) {
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      if ((deltaY > 10 || deltaX > 15) && longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        setTouchStartPos(null);
        return;
      }
    }
    if (draggedExercise) {
      // preventDefault is handled by the native listener registered with { passive: false }
      setTouchCurrentPos({ x: touch.clientX, y: touch.clientY });
      lastTouchXRef.current = touch.clientX;
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const dayCard = element?.closest("[data-day]");
      setHoveredDay(
        dayCard ? (dayCard.getAttribute("data-day") as DayName) : null,
      );
      if (!autoScrollFrameRef.current) handleAutoScroll();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    if (autoScrollFrameRef.current) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
    if (draggedExercise && hoveredDay) {
      if (draggedExercise.isFromCarousel) {
        const success = handleDayDrop(hoveredDay);
        if (success) toast.success(`Ejercicio añadido a ${hoveredDay}`);
      } else if (
        draggedExercise.sourceDay &&
        draggedExercise.sourceDay !== hoveredDay
      ) {
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
          if (moved) toast.success(`Ejercicio movido a ${hoveredDay}`);
          else toast.error("Este ejercicio ya existe en este día");
        }
      }
    }
    setTouchStartPos(null);
    setTouchCurrentPos(null);
    setHoveredDay(null);
    setDraggedExercise(null);
  };

  // ── Label handlers ──────────────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────────────────
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
      {/* Header */}
      <div className="flex-shrink-0 bg-background border-b pt-6 pb-4 px-4 z-20">
        <div
          className="flex items-center justify-between"
          data-tour="planner-header"
        >
          <h1 className="text-2xl font-bold">Mi rutina semanal</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={startTour}
            title="Ver tutorial"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Day columns */}
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
              id={index === 0 ? "tour-planner-day-0" : undefined}
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
              onDragLeave={(e) =>
                e.currentTarget.classList.remove("ring-2", "ring-primary")
              }
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
                    id={index === 0 ? "tour-planner-play-0" : undefined}
                    onClick={() => navigate(`/workout/${dayPlan.day}`)}
                  >
                    <Play className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Exercise list */}
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
                        id={
                          index === 0 && idx === 0
                            ? "tour-planner-ex-0"
                            : undefined
                        }
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
                        {/* Thumbnail */}
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

                        {/* Info */}
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
                            {ex.sets} series × {ex.reps} reps
                          </p>
                          <Badge variant="secondary" className="text-sm">
                            {data.muscleGroup}
                          </Badge>
                        </div>

                        {/* ⋮ Menu */}
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

                          <DropdownMenuContent align="end" className="w-52">
                            {/* Ver detalles */}
                            <DropdownMenuItem
                              onClick={() => {
                                setDetailExercise(data);
                                setDetailSheetOpen(true);
                              }}
                            >
                              <Info className="w-4 h-4 mr-2 text-muted-foreground" />
                              Ver detalles
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Editar series */}
                            <DropdownMenuItem
                              onClick={() =>
                                openEditExDialog(
                                  dayPlan.day,
                                  ex.id,
                                  data.name,
                                  ex.sets,
                                )
                              }
                            >
                              <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
                              Editar series
                            </DropdownMenuItem>

                            {/* Mover a otro día */}
                            <DropdownMenuItem
                              onClick={() =>
                                openDayPicker(
                                  "move",
                                  dayPlan.day,
                                  ex.id,
                                  ex.exerciseId,
                                  data.name,
                                  ex.sets,
                                  ex.reps,
                                )
                              }
                            >
                              <ArrowLeftRight className="w-4 h-4 mr-2 text-muted-foreground" />
                              Mover
                            </DropdownMenuItem>

                            {/* Copiar a otro día */}
                            <DropdownMenuItem
                              onClick={() =>
                                openDayPicker(
                                  "copy",
                                  dayPlan.day,
                                  ex.id,
                                  ex.exerciseId,
                                  data.name,
                                  ex.sets,
                                  ex.reps,
                                )
                              }
                            >
                              <Copy className="w-4 h-4 mr-2 text-muted-foreground" />
                              Copiar
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Eliminar */}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                removeExerciseFromDay(dayPlan.day, ex.id)
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })
                )}

                {/* Add exercise button */}
                <div className="flex justify-center pt-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full"
                    id={index === 0 ? "tour-planner-add-0" : undefined}
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

      {/* Recent exercises carousel */}
      <div
        className="flex-shrink-0 border-t bg-background z-20"
        data-tour="planner-carousel"
      >
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
              data-tour="planner-carousel-all"
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
                        id={idx === 0 ? "tour-carousel-card-0" : undefined}
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

      {/* ── Edit series dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={editExDialog.isOpen}
        onOpenChange={(open) => !open && closeEditExDialog()}
      >
        <DialogContent className="max-w-sm w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Editar series</DialogTitle>
            <DialogDescription className="truncate">
              {editExDialog.exName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Sets */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Series</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={() => adjustValue("sets", -1, 1, 20)}
                  disabled={editExDialog.sets <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold tabular-nums">
                    {editExDialog.sets}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editExDialog.sets === 1 ? "serie" : "series"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={() => adjustValue("sets", +1, 1, 20)}
                  disabled={editExDialog.sets >= 20}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
            <Button onClick={handleSaveEditEx} className="w-full m-0">
              Guardar
            </Button>
            <Button
              variant="outline"
              onClick={closeEditExDialog}
              className="w-full m-0"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Move / Copy day picker sheet ───────────────────────────────────── */}
      <Sheet
        open={dayPickerDialog.isOpen}
        onOpenChange={(open) => !open && closeDayPicker()}
      >
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {dayPickerDialog.mode === "move"
                ? "Mover ejercicio"
                : "Copiar ejercicio"}
            </SheetTitle>
            <SheetDescription className="truncate text-sm text-muted-foreground">
              {dayPickerDialog.exName}
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4 pb-4">
            {DAYS.filter((d) => d !== dayPickerDialog.sourceDay).map(
              (targetDay) => {
                const alreadyExists = plan
                  .find((d) => d.day === targetDay)
                  ?.exercises.some(
                    (e) => e.exerciseId === dayPickerDialog.exerciseId,
                  );
                return (
                  <Button
                    key={targetDay}
                    variant="outline"
                    disabled={alreadyExists}
                    onClick={() => {
                      if (!dayPickerDialog.sourceDay || !dayPickerDialog.exId)
                        return;
                      if (dayPickerDialog.mode === "move") {
                        const moved = moveExercise(
                          dayPickerDialog.sourceDay,
                          targetDay,
                          dayPickerDialog.exId,
                        );
                        if (moved) toast.success(`Movido a ${targetDay}`);
                        else toast.error("Ya existe en ese día");
                      } else {
                        addExerciseToDay(targetDay, {
                          id: `${targetDay}-${dayPickerDialog.exerciseId}-${Date.now()}`,
                          exerciseId: dayPickerDialog.exerciseId!,
                          sets: dayPickerDialog.sets,
                          reps: dayPickerDialog.reps,
                        });
                        toast.success(`Copiado a ${targetDay}`);
                      }
                      closeDayPicker();
                    }}
                    className="h-11"
                  >
                    {targetDay}
                  </Button>
                );
              },
            )}
            <Button
              variant="outline"
              className="col-span-2 mt-2"
              onClick={closeDayPicker}
            >
              Cancelar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Edit label dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={editLabelDialog.isOpen}
        onOpenChange={(open) => {
          if (!open)
            setEditLabelDialog({ isOpen: false, day: null, currentLabel: "" });
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
                if (e.key === "Enter") handleSaveLabel();
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

      {/* Drag ghost */}
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

      {/* Exercise detail sheet */}
      <ExerciseDetailSheet
        exercise={detailExercise}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </motion.div>
  );
}
