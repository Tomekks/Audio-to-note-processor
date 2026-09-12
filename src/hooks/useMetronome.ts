"use client";

import { useCallback, useEffect, useState } from "react";

// Drag-selected step range (SheetDiagram.RULES.md rule 10) -- inclusive on
// both ends, in the same global step-index space as currentStep.
export type LoopRange = { start: number; end: number };

// Owns all playback timing for the active song: play/pause, tempo, manual
// step navigation, and an optional loop range -- see SheetDiagram.RULES.md
// rules 8-10. Deliberately dumb about *why* a step changed (playing,
// stepBy, or a fresh loopRange) -- every caller just reads currentStep.
export function useMetronome(tempoBpm: number, stepCount: number) {
  const [bpm, setBpm] = useState(tempoBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  // null until playback has actually started once -- no playhead is drawn
  // before that (SheetDiagram.RULES.md rule 8).
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [loopRange, setLoopRange] = useState<LoopRange | null>(null);

  const bounds = useCallback(
    () => ({ lo: loopRange?.start ?? 0, hi: loopRange?.end ?? Math.max(stepCount - 1, 0) }),
    [loopRange, stepCount],
  );

  useEffect(() => {
    if (!isPlaying || stepCount === 0) return;
    const id = setInterval(() => {
      setCurrentStep((prev) => {
        const { lo, hi } = bounds();
        const cur = prev ?? lo;
        return cur >= hi ? lo : cur + 1;
      });
    }, 60000 / bpm);
    return () => clearInterval(id);
  }, [isPlaying, bpm, stepCount, bounds]);

  const toggle = useCallback(() => {
    setIsPlaying((v) => !v);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(null);
  }, []);

  // Manual step navigation (SheetDiagram.RULES.md rule 9) -- always stops
  // playback first, clamped (not wrapped) to the current loop/song bounds.
  const stepBy = useCallback(
    (delta: number) => {
      setIsPlaying(false);
      setCurrentStep((prev) => {
        const { lo, hi } = bounds();
        const cur = prev ?? lo;
        return Math.min(Math.max(cur + delta, lo), hi);
      });
    },
    [bounds],
  );

  return {
    bpm,
    setBpm,
    isPlaying,
    toggle,
    reset,
    currentStep,
    stepBy,
    loopRange,
    // useState's setter has a stable identity across renders, so this is
    // safe to pass straight through as a prop without its own useCallback.
    setLoopRange,
  };
}
