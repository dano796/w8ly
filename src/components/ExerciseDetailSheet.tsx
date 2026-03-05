import { useState } from "react";
import { Exercise } from "@/utils/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Dumbbell,
  Target,
  Zap,
  Activity,
  Wrench,
  Trash2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

interface ExerciseDetailSheetProps {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (exercise: Exercise) => void;
}

export default function ExerciseDetailSheet({
  exercise,
  open,
  onOpenChange,
  onDelete,
}: ExerciseDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<"details" | "instructions">(
    "details",
  );

  // Reset to details tab when sheet opens (move logic to onOpenChange handler)
  const handleOpenChange = (openValue: boolean) => {
    if (openValue) {
      setActiveTab("details");
    }
    onOpenChange(openValue);
  };

  if (!exercise) return null;

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const threshold = 50;
    if (info.offset.x < -threshold && activeTab === "details") {
      setActiveTab("instructions");
    } else if (info.offset.x > threshold && activeTab === "instructions") {
      setActiveTab("details");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <SheetHeader className="p-0 space-y-0 flex-1 min-w-0">
              <SheetTitle className="text-lg font-bold leading-tight text-left pr-2">
                {exercise.name}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detalles del ejercicio {exercise.name}
              </SheetDescription>
            </SheetHeader>
            {exercise.id.startsWith("custom-") && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  onDelete(exercise);
                  onOpenChange(false);
                }}
                className="text-destructive hover:text-destructive flex-shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Custom Tab Navigation */}
        <div className="px-6 pt-6 pb-2 bg-background">
          <div className="flex justify-center">
            <div className="bg-muted rounded-full px-1.5 py-1.5 flex gap-2 justify-center min-w-[200px] max-w-fit shadow-sm">
              <button
                onClick={() => setActiveTab("details")}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-colors border-none text-center",
                  activeTab === "details"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground",
                )}
                style={{ minWidth: 100 }}
              >
                Detalles
              </button>
              <button
                onClick={() => setActiveTab("instructions")}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-colors border-none text-center",
                  activeTab === "instructions"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground",
                )}
                style={{ minWidth: 100 }}
              >
                Ejecución
              </button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing select-none"
          >
            <AnimatePresence mode="wait">
              {activeTab === "details" ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-4 space-y-6"
                >
                  {/* Exercise Image/GIF */}
                  <div className="w-full min-h-[240px] max-h-[320px] bg-muted/10 rounded-xl flex items-center justify-center overflow-hidden border border-border/30">
                    {exercise.imageUrl ? (
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.name}
                        className="w-full h-auto object-contain pointer-events-none"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <Dumbbell className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {exercise.muscleGroup}
                    </Badge>
                    {exercise.level && (
                      <Badge
                        variant="outline"
                        className={`text-sm px-3 py-1 capitalize ${
                          exercise.level.toLowerCase() === "principiante"
                            ? "border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950"
                            : exercise.level.toLowerCase() === "intermedio"
                              ? "border-yellow-600 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950"
                              : "border-red-600 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950"
                        }`}
                      >
                        {exercise.level.charAt(0).toUpperCase() +
                          exercise.level.slice(1)}
                      </Badge>
                    )}
                    {exercise.category && (
                      <Badge
                        variant="outline"
                        className="text-sm px-3 py-1 capitalize"
                      >
                        {exercise.category}
                      </Badge>
                    )}
                  </div>

                  {/* Exercise Details */}
                  <div className="grid gap-4">
                    {/* Primary Muscles */}
                    {exercise.primaryMuscles &&
                      exercise.primaryMuscles.length > 0 && (
                        <Card className="p-5 bg-muted/30 border shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center mt-0.5">
                              <Target className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-base mb-2">
                                Músculos principales
                              </h3>
                              <div className="flex gap-2 flex-wrap">
                                {exercise.primaryMuscles.map((muscle, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {muscle.charAt(0).toUpperCase() +
                                      muscle.slice(1).toLowerCase()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                    {/* Secondary Muscles */}
                    {exercise.secondaryMuscles &&
                      exercise.secondaryMuscles.length > 0 && (
                        <Card className="p-5 bg-muted/30 border shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center mt-0.5">
                              <Zap className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-base mb-2">
                                Músculos secundarios
                              </h3>
                              <div className="flex gap-2 flex-wrap">
                                {exercise.secondaryMuscles.map(
                                  (muscle, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {muscle.charAt(0).toUpperCase() +
                                        muscle.slice(1).toLowerCase()}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                    {/* Force and Mechanic */}
                    {(exercise.force || exercise.mechanic) && (
                      <Card className="p-5 bg-muted/30 border shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center mt-0.5">
                            <Activity className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-base mb-2">
                              Tipo de movimiento
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                              {exercise.force && (
                                <Badge variant="secondary" className="text-xs">
                                  {exercise.force.charAt(0).toUpperCase() +
                                    exercise.force.slice(1)}
                                </Badge>
                              )}
                              {exercise.mechanic && (
                                <Badge variant="outline" className="text-xs">
                                  {exercise.mechanic.charAt(0).toUpperCase() +
                                    exercise.mechanic.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Equipment */}
                    {exercise.equipment && (
                      <Card className="p-5 bg-muted/30 border shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center mt-0.5">
                            <Wrench className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-base mb-2">
                              Equipamiento
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {exercise.equipment.charAt(0).toUpperCase() +
                                exercise.equipment.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Bottom padding for scroll */}
                  <div className="h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="instructions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 py-4"
                >
                  {exercise.instructions && exercise.instructions.length > 0 ? (
                    <div className="space-y-4">
                      {exercise.instructions.map((instruction, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                              {idx + 1}
                            </div>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed pt-1">
                            {instruction}
                          </p>
                        </div>
                      ))}
                      {/* Bottom padding for scroll */}
                      <div className="h-4" />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        No hay instrucciones disponibles para este ejercicio
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
