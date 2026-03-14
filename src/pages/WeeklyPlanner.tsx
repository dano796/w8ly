import { usePlannerTour } from "@/hooks/tours";
import { HelpCircle } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWeekDecks } from "@/hooks/useWeekDecks";
import { useRecentlyAddedExercises } from "@/hooks/useRecentlyAddedExercises";
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
import { TEMPLATE_CATALOG } from "@/utils/weekTemplates";
import { WeekDeck } from "@/utils/types";
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
  Download,
  Upload,
  FolderOpen,
  Library,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { pageVariants, listItemVariants } from "@/utils/animations";

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
    decks,
    activeDeck,
    activeDeckId,
    removeExerciseFromDay,
    reorderExercises,
    addExerciseToDay,
    updateDayLabel,
    moveExercise,
    exportDay,
    importDay,
    clearDayExercises,
    createDeck,
    duplicateDeck,
    updateDeck,
    deleteDeck,
    switchDeck,
    exportDeck,
    importDeck,
  } = useWeekDecks();
  const { settings } = useSettings();
  const { recentIds, trackAdded } = useRecentlyAddedExercises();

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
    generatedId?: string;
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
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

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

  // ── File input ref ──────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Import confirmation dialog ──────────────────────────────────────────────
  const [importConfirmDialog, setImportConfirmDialog] = useState<{
    isOpen: boolean;
    day: DayName | null;
    jsonData: string;
    existingCount: number;
  }>({
    isOpen: false,
    day: null,
    jsonData: "",
    existingCount: 0,
  });

  // ── Clear day confirmation dialog ───────────────────────────────────────────
  const [clearDayDialog, setClearDayDialog] = useState<{
    isOpen: boolean;
    day: DayName | null;
    exerciseCount: number;
  }>({
    isOpen: false,
    day: null,
    exerciseCount: 0,
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

  // ── Deck management dialogs ─────────────────────────────────────────────────
  const [deckSelectorOpen, setDeckSelectorOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [deckNameDialog, setDeckNameDialog] = useState<{
    isOpen: boolean;
    mode: "create" | "rename" | "duplicate";
    deckId?: string;
    currentName: string;
  }>({
    isOpen: false,
    mode: "create",
    currentName: "",
  });
  const [deleteDeckDialog, setDeleteDeckDialog] = useState<{
    isOpen: boolean;
    deckId: string | null;
    deckName: string;
  }>({
    isOpen: false,
    deckId: null,
    deckName: "",
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

  // ── Get current day ─────────────────────────────────────────────────────────
  const getCurrentDayName = (): DayName => {
    const dayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayNames: DayName[] = [
      "Domingo", // 0
      "Lunes", // 1
      "Martes", // 2
      "Miércoles", // 3
      "Jueves", // 4
      "Viernes", // 5
      "Sábado", // 6
    ];
    return dayNames[dayIndex];
  };

  const currentDayName = getCurrentDayName();

  // ── Tour ────────────────────────────────────────────────────────────────────
  const currentDayExercises =
    plan.find((d) => d.day === currentDayName)?.exercises ?? [];
  const { startTour } = usePlannerTour({
    ready: plan.length > 0,
    setCarouselCollapsed: setIsCarouselCollapsed,
    currentDayExercises: currentDayExercises,
    addExerciseToCurrentDay: (exercise) =>
      addExerciseToDay(currentDayName, exercise),
    removeSeedFromCurrentDay: (instanceId) =>
      removeExerciseFromDay(currentDayName, instanceId),
    trackRecentExercise: trackAdded,
    currentDayName: currentDayName,
  });

  // ── Scroll to current day on mount ──────────────────────────────────────────
  const hasScrolledToCurrentDay = useRef(false);

  useEffect(() => {
    // Only scroll once on initial mount
    if (
      hasScrolledToCurrentDay.current ||
      !scrollContainerRef.current ||
      plan.length === 0
    ) {
      return;
    }

    const dayIndex = plan.findIndex((d) => d.day === currentDayName);

    if (dayIndex !== -1) {
      hasScrolledToCurrentDay.current = true;
      // Use setTimeout to ensure the DOM is fully rendered
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const leftGutter = 16;
          // Scroll to the column's offsetLeft, let snap handle correction
          const dayColumn = Array.from(container.children).find(
            (el) =>
              el.querySelector &&
              el.querySelector(`[data-day="${currentDayName}"]`),
          ) as HTMLElement | undefined;
          if (dayColumn) {
            container.scrollTo({
              left: dayColumn.offsetLeft,
              behavior: "smooth",
            });
            setTimeout(() => {
              dayColumn.scrollIntoView({
                behavior: "auto",
                block: "nearest",
                inline: "start",
              });
            }, 350);
          }
        }
      }, 100);
    }
  }, [plan, currentDayName]); // Only run when plan changes (on initial load)

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
  // Uses persisted history from useRecentlyAddedExercises — stays intact
  // even if the user removes exercises from days.
  const recentExercises = useMemo(() => {
    return recentIds
      .map((id) => {
        const data = exerciseMap[id];
        if (!data) return null;
        return {
          exerciseId: id,
          name: data.name,
          muscleGroup: data.muscleGroup,
          imageUrl: data.imageUrl,
        };
      })
      .filter(Boolean) as {
      exerciseId: string;
      name: string;
      muscleGroup: string;
      imageUrl?: string;
    }[];
  }, [recentIds, exerciseMap]);

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
      // Generate id in a safe way: pass a generated id from the event handler
      if (!draggedExercise.generatedId) {
        // Should never happen, fallback to exerciseId
        addExerciseToDay(targetDay, {
          id: `${targetDay}-${draggedExercise.exerciseId}`,
          exerciseId: draggedExercise.exerciseId,
          sets: settings.defaultSets,
          reps: 8,
        });
      } else {
        addExerciseToDay(targetDay, {
          id: draggedExercise.generatedId,
          exerciseId: draggedExercise.exerciseId,
          sets: settings.defaultSets,
          reps: 8,
        });
      }
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
      const generatedId = `${Math.random()
        .toString(36)
        .slice(2, 10)}-${Date.now()}`;
      setDraggedExercise({ exerciseId, isFromCarousel: true, generatedId });
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

  const handleTouchEnd = () => {
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

  // ── Export/Import handlers ──────────────────────────────────────────────────
  const handleExportDay = async (day: DayName) => {
    try {
      const jsonData = exportDay(day);
      const fileName = `w8ly-${day.toLowerCase()}.json`;
      const isNative =
        typeof window !== "undefined" && !!(window as any).Capacitor;
      if (isNative) {
        // Exportar usando Filesystem y Share
        const { Filesystem, Directory, Encoding } = await import(
          "@capacitor/filesystem"
        );
        const { Share } = await import("@capacitor/share");
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonData,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "Exportar Rutina",
          text: "Aquí tienes tu rutina de entrenamiento",
          url: result.uri,
          dialogTitle: "Guardar o enviar rutina",
        });
      } else {
        // Exportar usando Blob y descarga directa
        const dataBlob = new Blob([jsonData], {
          type: "application/json;charset=utf-8;",
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
      toast.success("Rutina exportada");
    } catch (error) {
      toast.error("Error al exportar la rutina");
    }
  };

  const handleImportFromFile = (day: DayName) => {
    if (fileInputRef.current) {
      // Reset the input value to allow selecting the same file again
      fileInputRef.current.value = "";

      fileInputRef.current.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const jsonData = event.target?.result as string;

            // Check if the day already has exercises
            const dayPlan = plan.find((d) => d.day === day);
            const existingCount = dayPlan?.exercises.length || 0;

            if (existingCount > 0) {
              // Show confirmation dialog
              setImportConfirmDialog({
                isOpen: true,
                day,
                jsonData,
                existingCount,
              });
            } else {
              // No exercises, import directly
              const success = importDay(day, jsonData, "replace");
              if (success) {
                toast.success("Rutina importada");
              } else {
                toast.error("Error: formato inválido");
              }
            }

            // Reset input value after processing
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          };
          reader.readAsText(file);
        }
      };
      fileInputRef.current.click();
    }
  };

  const handleConfirmImport = (mode: "replace" | "merge") => {
    const { day, jsonData } = importConfirmDialog;
    if (!day || !jsonData) return;

    const success = importDay(day, jsonData, mode);
    if (success) {
      if (mode === "replace") {
        toast.success("Rutina reemplazada");
      } else {
        toast.success("Ejercicios agregados");
      }
    } else {
      toast.error("Error: formato inválido");
    }

    setImportConfirmDialog({
      isOpen: false,
      day: null,
      jsonData: "",
      existingCount: 0,
    });
  };

  const handleOpenClearDayDialog = (day: DayName) => {
    const dayPlan = plan.find((d) => d.day === day);
    const exerciseCount = dayPlan?.exercises.length || 0;

    setClearDayDialog({
      isOpen: true,
      day,
      exerciseCount,
    });
  };

  const handleConfirmClearDay = () => {
    const { day } = clearDayDialog;
    if (!day) return;

    clearDayExercises(day);
    toast.success("Ejercicios eliminados");

    setClearDayDialog({
      isOpen: false,
      day: null,
      exerciseCount: 0,
    });
  };

  // ── Deck management handlers ────────────────────────────────────────────────
  const handleCreateDeckFromTemplate = (
    templateKey: keyof typeof TEMPLATE_CATALOG,
  ) => {
    if (decks.length >= 3) {
      toast.error("Máximo 3 rutinas permitidas. Elimina una para crear otra.");
      return;
    }
    const template = TEMPLATE_CATALOG[templateKey];
    const newDeck = template.create();
    const deckId = createDeck(newDeck);
    if (deckId) {
      toast.success(`Rutina "${newDeck.name}" creada`);
      setTemplateSelectorOpen(false);
    } else {
      toast.error("No se pudo crear la rutina");
    }
  };

  const handleCreateEmptyDeck = () => {
    if (decks.length >= 3) {
      toast.error("Máximo 3 rutinas permitidas. Elimina una para crear otra.");
      return;
    }
    setDeckNameDialog({
      isOpen: true,
      mode: "create",
      currentName: "Mi Rutina Nueva",
    });
  };

  const handleSaveDeckName = () => {
    const { mode, currentName, deckId } = deckNameDialog;

    if (!currentName.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    if (mode === "create") {
      if (decks.length >= 3) {
        toast.error(
          "Máximo 3 rutinas permitidas. Elimina una para crear otra.",
        );
        setDeckNameDialog({ isOpen: false, mode: "create", currentName: "" });
        return;
      }
      const template = TEMPLATE_CATALOG.custom;
      const newDeck = template.create(currentName.trim());
      const id = createDeck(newDeck);
      if (id) {
        toast.success("Rutina creada");
      } else {
        toast.error("No se pudo crear la rutina");
      }
    } else if (mode === "rename" && deckId) {
      updateDeck(deckId, { name: currentName.trim() });
      toast.success("Rutina renombrada");
    } else if (mode === "duplicate" && deckId) {
      const newId = duplicateDeck(deckId, currentName.trim());
      if (newId) {
        toast.success("Rutina duplicada");
      }
    }

    setDeckNameDialog({ isOpen: false, mode: "create", currentName: "" });
  };

  const handleDuplicateDeck = (deckId: string) => {
    if (decks.length >= 3) {
      toast.error("Máximo 3 rutinas permitidas. Elimina una para duplicar.");
      return;
    }
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;

    setDeckNameDialog({
      isOpen: true,
      mode: "duplicate",
      deckId,
      currentName: `${deck.name} (Copia)`,
    });
  };

  const handleRenameDeck = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;

    setDeckNameDialog({
      isOpen: true,
      mode: "rename",
      deckId,
      currentName: deck.name,
    });
  };

  const handleDeleteDeck = (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;

    if (decks.length <= 1) {
      toast.error("No puedes eliminar la única rutina");
      return;
    }

    setDeleteDeckDialog({
      isOpen: true,
      deckId,
      deckName: deck.name,
    });
  };

  const handleConfirmDeleteDeck = () => {
    const { deckId } = deleteDeckDialog;
    if (!deckId) return;

    const success = deleteDeck(deckId);
    if (success) {
      toast.success("Rutina eliminada");
    } else {
      toast.error("No puedes eliminar la única rutina");
    }

    setDeleteDeckDialog({
      isOpen: false,
      deckId: null,
      deckName: "",
    });
  };

  const handleExportDeck = async () => {
    try {
      const jsonData = exportDeck();
      const fileName = `w8ly-${
        activeDeck?.name?.toLowerCase().replace(/\s+/g, "-") || "rutina"
      }.json`;
      // Importar Filesystem y Share dinámicamente
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");
      // Guardar el archivo en la caché
      // Usar Encoding.UTF8 para evitar error de tipo
      const { Encoding } = await import("@capacitor/filesystem");
      const result = await Filesystem.writeFile({
        path: fileName,
        data: jsonData,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      // Compartir el archivo usando el menú del sistema
      await Share.share({
        title: "Exportar Rutina Completa",
        text: "Aquí tienes tu rutina completa de entrenamiento",
        url: result.uri,
        dialogTitle: "Guardar o enviar rutina",
      });
      toast.success("Rutina completa exportada");
    } catch (error) {
      toast.error("Error al exportar la rutina");
    }
  };

  const handleImportDeck = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";

      fileInputRef.current.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const jsonData = event.target?.result as string;
            const success = importDeck(jsonData);

            if (success) {
              toast.success("Rutina importada");
            } else {
              toast.error("Error: formato inválido");
            }

            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          };
          reader.readAsText(file);
        }
      };

      fileInputRef.current.click();
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
          <button
            onClick={() => setDeckSelectorOpen(true)}
            className="flex items-center gap-2 flex-1 min-w-0 group -ml-1 p-1 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <h1 className="text-2xl font-bold truncate">
              {activeDeck?.name || "Mi Rutina"}
            </h1>
            <ChevronDown className="w-5 h-5 flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTemplateSelectorOpen(true)}
              title="Crear desde plantilla"
              data-tour="planner-library-btn"
            >
              <Library className="w-4 h-4 text-muted-foreground" />
            </Button>
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
              id={
                dayPlan.day === currentDayName
                  ? "tour-planner-day-0"
                  : undefined
              }
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
                <div className="flex-1 min-w-0 mr-1">
                  <h3 className="font-semibold text-lg flex items-center min-w-0">
                    <span className="flex-shrink-0">{dayPlan.day}</span>
                    {dayPlan.label && (
                      <span className="text-primary truncate ml-1">
                        {" "}
                        - {dayPlan.label}
                      </span>
                    )}
                  </h3>
                  <p className="text-base text-muted-foreground">
                    {dayPlan.exercises.length} ejercicio
                    {dayPlan.exercises.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {dayPlan.exercises.length > 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      id={
                        dayPlan.day === currentDayName
                          ? "tour-planner-play-0"
                          : undefined
                      }
                      onClick={() => navigate(`/workout/${dayPlan.day}`)}
                      title="Iniciar rutina"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        title="Más opciones"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() =>
                          handleOpenEditLabel(dayPlan.day, dayPlan.label)
                        }
                      >
                        <Edit2 className="w-4 h-4 mr-2 text-muted-foreground" />
                        Editar etiqueta
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleExportDay(dayPlan.day)}
                        disabled={dayPlan.exercises.length === 0}
                      >
                        <Upload className="w-4 h-4 mr-2 text-muted-foreground" />
                        Exportar rutina
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleImportFromFile(dayPlan.day)}
                      >
                        <Download className="w-4 h-4 mr-2 text-muted-foreground" />
                        Importar rutina
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleOpenClearDayDialog(dayPlan.day)}
                        disabled={dayPlan.exercises.length === 0}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpiar ejercicios
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                          dayPlan.day === currentDayName && idx === 0
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
                              Mover a…
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
                              Copiar a…
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
                    id={
                      dayPlan.day === currentDayName
                        ? "tour-planner-add-0"
                        : undefined
                    }
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
              {dayPickerDialog.mode === "move" ? "Mover a…" : "Copiar a…"}
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
                        const exerciseId = `${targetDay}-${
                          dayPickerDialog.exerciseId
                        }-${Date.now()}`;
                        addExerciseToDay(targetDay, {
                          id: exerciseId,
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

      {/* Import confirmation dialog */}
      <AlertDialog
        open={importConfirmDialog.isOpen}
        onOpenChange={(open) =>
          !open &&
          setImportConfirmDialog({
            isOpen: false,
            day: null,
            jsonData: "",
            existingCount: 0,
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>El día ya tiene ejercicios</AlertDialogTitle>
            <AlertDialogDescription>
              Este día tiene {importConfirmDialog.existingCount} ejercicio
              {importConfirmDialog.existingCount !== 1 ? "s" : ""}. ¿Qué deseas
              hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleConfirmImport("merge")}
            >
              Agregar ejercicios
            </Button>
            <AlertDialogAction onClick={() => handleConfirmImport("replace")}>
              Reemplazar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear day confirmation dialog */}
      <AlertDialog
        open={clearDayDialog.isOpen}
        onOpenChange={(open) =>
          !open &&
          setClearDayDialog({
            isOpen: false,
            day: null,
            exerciseCount: 0,
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Limpiar todos los ejercicios?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán {clearDayDialog.exerciseCount} ejercicio
              {clearDayDialog.exerciseCount !== 1 ? "s" : ""} de{" "}
              {clearDayDialog.day}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearDay}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpiar ejercicios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deck selector sheet */}
      <Sheet open={deckSelectorOpen} onOpenChange={setDeckSelectorOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>Mis Rutinas</SheetTitle>
            <SheetDescription>
              Selecciona una rutina o crea una nueva (máximo 3)
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2 py-1 pb-4 overflow-y-auto max-h-[50vh] px-0.5">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                className={`p-4 cursor-pointer transition-all ${
                  deck.id === activeDeckId
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
                onClick={() => {
                  switchDeck(deck.id);
                  setDeckSelectorOpen(false);
                  toast.success(`Cambiado a "${deck.name}"`);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{deck.name}</h3>
                    {deck.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {deck.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {deck.plan.reduce(
                          (acc, d) => acc + d.exercises.length,
                          0,
                        )}{" "}
                        ejercicios
                      </Badge>
                      {deck.level && (
                        <Badge variant="secondary" className="text-xs">
                          {deck.level === "beginner"
                            ? "Principiante"
                            : deck.level === "intermediate"
                            ? "Intermedio"
                            : "Avanzado"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameDeck(deck.id);
                          setDeckSelectorOpen(false);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Renombrar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateDeck(deck.id);
                          setDeckSelectorOpen(false);
                        }}
                        disabled={decks.length >= 3}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeck(deck.id);
                        }}
                        className="text-destructive"
                        disabled={decks.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
          <div className="space-y-2 pt-4 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="default"
              className="w-full"
              onClick={() => {
                handleCreateEmptyDeck();
                setDeckSelectorOpen(false);
              }}
              disabled={decks.length >= 3}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva rutina vacía {decks.length >= 3 && "(Máx. 3)"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  handleExportDeck();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  handleImportDeck();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Template selector sheet */}
      <Sheet open={templateSelectorOpen} onOpenChange={setTemplateSelectorOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>Plantillas de Rutinas</SheetTitle>
            <SheetDescription>
              Selecciona una plantilla para empezar. Puedes tener hasta 3
              rutinas
              {decks.length >= 3 && " (máximo alcanzado)"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3 pb-4 overflow-y-auto max-h-[60vh]">
            {Object.entries(TEMPLATE_CATALOG).map(([key, template]) => (
              <Card
                key={key}
                className={`p-4 transition-all ${
                  decks.length >= 3
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:bg-accent"
                }`}
                onClick={() => {
                  if (decks.length < 3) {
                    handleCreateDeckFromTemplate(
                      key as keyof typeof TEMPLATE_CATALOG,
                    );
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {template.level === "beginner"
                        ? "Principiante"
                        : template.level === "intermediate"
                        ? "Intermedio"
                        : "Avanzado"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Deck name dialog (create/rename/duplicate) */}
      <Dialog
        open={deckNameDialog.isOpen}
        onOpenChange={(open) =>
          !open &&
          setDeckNameDialog({ isOpen: false, mode: "create", currentName: "" })
        }
      >
        <DialogContent className="max-w-[425px] w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>
              {deckNameDialog.mode === "create"
                ? "Nueva Rutina"
                : deckNameDialog.mode === "rename"
                ? "Renombrar Rutina"
                : "Duplicar Rutina"}
            </DialogTitle>
            <DialogDescription>
              {deckNameDialog.mode === "create"
                ? "Dale un nombre a tu nueva rutina personalizada"
                : deckNameDialog.mode === "rename"
                ? "Cambia el nombre de tu rutina"
                : "Dale un nombre a la copia"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="deck-name">Nombre</Label>
            <Input
              id="deck-name"
              value={deckNameDialog.currentName}
              onChange={(e) =>
                setDeckNameDialog({
                  ...deckNameDialog,
                  currentName: e.target.value,
                })
              }
              placeholder="Mi Rutina Personalizada"
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveDeckName();
              }}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleSaveDeckName} className="w-full m-0">
              {deckNameDialog.mode === "create" ? "Crear" : "Guardar"}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setDeckNameDialog({
                  isOpen: false,
                  mode: "create",
                  currentName: "",
                })
              }
              className="w-full m-0"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete deck confirmation */}
      <AlertDialog
        open={deleteDeckDialog.isOpen}
        onOpenChange={(open) =>
          !open &&
          setDeleteDeckDialog({
            isOpen: false,
            deckId: null,
            deckName: "",
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rutina?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la rutina "{deleteDeckDialog.deckName}". Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteDeck}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar rutina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" />

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
