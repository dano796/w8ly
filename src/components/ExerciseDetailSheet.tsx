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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, Target, Zap, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExerciseDetailSheetProps {
  exercise: Exercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExerciseDetailSheet({
  exercise,
  open,
  onOpenChange,
}: ExerciseDetailSheetProps) {
  if (!exercise) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <SheetHeader className="p-0 space-y-0 absolute left-1/2 -translate-x-1/2">
              <SheetTitle className="text-xl font-bold">
                {exercise.name}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detalles del ejercicio {exercise.name}
              </SheetDescription>
            </SheetHeader>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Exercise Image/GIF */}
            <div className="w-full aspect-video bg-white rounded-xl flex items-center justify-center overflow-hidden border">
              {exercise.imageUrl ? (
                <img
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
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
              {exercise.difficulty && (
                <Badge
                  variant="outline"
                  className={`text-sm px-3 py-1 ${
                    exercise.difficulty === "beginner"
                      ? "border-green-600 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950"
                      : exercise.difficulty === "intermediate"
                        ? "border-yellow-600 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950"
                        : "border-red-600 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950"
                  }`}
                >
                  {exercise.difficulty === "beginner"
                    ? "Principiante"
                    : exercise.difficulty === "intermediate"
                      ? "Intermedio"
                      : "Avanzado"}
                </Badge>
              )}
              {exercise.equipment && (
                <Badge
                  variant="outline"
                  className="text-sm px-3 py-1 capitalize"
                >
                  {exercise.equipment}
                </Badge>
              )}
            </div>

            {/* Description */}
            {exercise.description && (
              <Card
                className="p-4 bg-muted/50 border-0"
                id="exercise-description"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-0.5">
                    <Info className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-2">Descripción</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {exercise.description}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Target and Secondary Muscles */}
            <div className="grid gap-4">
              {/* Target Muscle */}
              {exercise.target && (
                <Card className="p-4 border-0 bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-0.5">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-2">
                        Músculo principal
                      </h3>
                      <Badge variant="secondary" className="capitalize">
                        {exercise.target}
                      </Badge>
                    </div>
                  </div>
                </Card>
              )}

              {/* Secondary Muscles */}
              {exercise.secondaryMuscles &&
                exercise.secondaryMuscles.length > 0 && (
                  <Card className="p-4 border-0 bg-muted/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-0.5">
                        <Zap className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-2">
                          Músculos secundarios
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                          {exercise.secondaryMuscles.map((muscle, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
            </div>

            {/* Instructions */}
            {exercise.instructions && exercise.instructions.length > 0 && (
              <div>
                <Separator className="mb-4" />
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">Cómo ejecutar</h3>
                </div>
                <div className="space-y-4">
                  {exercise.instructions.map((instruction, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </div>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed pt-1">
                        {instruction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom padding for scroll */}
            <div className="h-4" />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
