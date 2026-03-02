import { useLocalStorage } from "./useLocalStorage";
import { Exercise, MuscleGroup } from "@/utils/types";

export function useCustomExercises() {
    const [customExercises, setCustomExercises] = useLocalStorage<Exercise[]>(
        "w8ly-custom-exercises",
        [],
    );

    const addCustomExercise = (name: string, muscleGroup: MuscleGroup) => {
        const newExercise: Exercise = {
            id: `custom-${Date.now()}`,
            name,
            muscleGroup,
        };
        setCustomExercises((prev) => [...prev, newExercise]);
        return newExercise;
    };

    const removeCustomExercise = (exerciseId: string) => {
        setCustomExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
    };

    const updateCustomExercise = (
        exerciseId: string,
        name: string,
        muscleGroup: MuscleGroup,
    ) => {
        setCustomExercises((prev) =>
            prev.map((ex) =>
                ex.id === exerciseId ? { ...ex, name, muscleGroup } : ex,
            ),
        );
    };

    return {
        customExercises,
        addCustomExercise,
        removeCustomExercise,
        updateCustomExercise,
    };
}