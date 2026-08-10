import { useEffect, useRef } from 'react';

// A real field recording (Freesound Community, see SettingsPanel's "About"
// section for attribution) looped quietly in the background — replaces the
// earlier synthesized oscillator chirps with the genuine article. Browsers
// block audio before a user gesture, so playback only starts after the
// first pointerdown anywhere on the page.
const BIRDS_SRC = '/audio/birds-ambience.mp3';

export default function useAmbientChirps(enabled) {
  const audioRef = useRef(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio(BIRDS_SRC);
    audio.loop = true;
    audio.volume = 0.22;
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!enabled) {
      audio.pause();
      return;
    }

    const tryPlay = () => {
      audio.play().catch(() => {
        // Autoplay still blocked — the pointerdown listener below will retry.
      });
    };

    if (unlockedRef.current) {
      tryPlay();
      return;
    }

    const unlock = () => {
      unlockedRef.current = true;
      tryPlay();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, [enabled]);
}
