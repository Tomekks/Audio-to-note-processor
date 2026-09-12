"use client";

import { useCallback, useRef } from "react";

const NOTE_DURATION_SEC = 0.28;

// Beta, opt-in note-accurate playback sound (see StudioTabs.tsx /
// MetronomeControls.tsx). Deliberately a simple synthesized sine tone per
// note, not real guitar timbre -- sampling/synthesizing an actual guitar
// sound is a much bigger feature than "does the metronome step land on the
// right pitch," which is all this needs to demonstrate today.
export function useNoteSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    // Lazy -- AudioContext doesn't exist during SSR, and browsers require it
    // to be created (or resumed) from a user gesture, which playMidiNotes
    // always is (a Play button click, or the metronome it started).
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playMidiNotes = useCallback(
    (midiNotes: number[]) => {
      if (midiNotes.length === 0) return;
      const ctx = getContext();
      const now = ctx.currentTime;
      for (const midi of midiNotes) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        // Quick attack, exponential decay -- a plucked-string-ish envelope
        // rather than an abrupt on/off click.
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + NOTE_DURATION_SEC);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + NOTE_DURATION_SEC);
      }
    },
    [getContext],
  );

  return { playMidiNotes };
}
