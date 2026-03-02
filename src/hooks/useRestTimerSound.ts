import { useRef, useCallback } from "react";

const BEEP_SRC = "/sounds/rest_done.mp3";

export function useRestTimerSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Precargar el audio. Llámalo en el primer gesto del usuario
  const unlock = useCallback(() => {
    if (audioRef.current) return; // ya inicializado
    const audio = new Audio(BEEP_SRC);
    audio.preload = "auto";
    audio.load();
    audioRef.current = audio;
  }, []);

  const playBeep = useCallback(() => {
    if (!audioRef.current) {
      // Fallback: crear en el momento si unlock() no fue llamado antes
      audioRef.current = new Audio(BEEP_SRC);
    }
    const audio = audioRef.current;
    // Reiniciar si ya estaba reproduciéndose
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return { playBeep, unlock };
}
