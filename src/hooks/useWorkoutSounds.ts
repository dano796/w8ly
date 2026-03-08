import { useRef, useCallback } from "react";

const REST_TIMER_SOUND_SRC = "/sounds/rest_done.mp3";
const ACHIEVEMENT_SOUND_SRC = "/sounds/achievement.mp3";

/**
 * Hook para manejar los sonidos del entrenamiento
 * - Sonido de temporizador de descanso completado
 * - Sonido de logro/récord personal alcanzado
 */
export function useWorkoutSounds() {
  const restTimerAudioRef = useRef<HTMLAudioElement | null>(null);
  const achievementAudioRef = useRef<HTMLAudioElement | null>(null);

  // Precargar los audios. Llámalo en el primer gesto del usuario
  const unlock = useCallback(() => {
    if (restTimerAudioRef.current && achievementAudioRef.current) return; // ya inicializado

    const restTimerAudio = new Audio(REST_TIMER_SOUND_SRC);
    restTimerAudio.preload = "auto";
    restTimerAudio.load();
    restTimerAudioRef.current = restTimerAudio;

    const achievementAudio = new Audio(ACHIEVEMENT_SOUND_SRC);
    achievementAudio.preload = "auto";
    achievementAudio.load();
    achievementAudioRef.current = achievementAudio;
  }, []);

  const playRestTimer = useCallback(() => {
    if (!restTimerAudioRef.current) {
      // Fallback: crear en el momento si unlock() no fue llamado antes
      restTimerAudioRef.current = new Audio(REST_TIMER_SOUND_SRC);
    }
    const audio = restTimerAudioRef.current;
    // Reiniciar si ya estaba reproduciéndose
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  const playAchievement = useCallback(() => {
    if (!achievementAudioRef.current) {
      // Fallback: crear en el momento si unlock() no fue llamado antes
      achievementAudioRef.current = new Audio(ACHIEVEMENT_SOUND_SRC);
    }
    const audio = achievementAudioRef.current;
    // Reiniciar si ya estaba reproduciéndose
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return { playRestTimer, playAchievement, unlock };
}
