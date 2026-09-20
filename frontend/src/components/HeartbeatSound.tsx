import { useEffect, useRef } from "react";
import { useCabinet } from "@/context/Cabinet";
import { audio } from "@/lib/audio";
import { BPM, heartClock } from "@/lib/heartClock";

/**
 * Planifie les sons sur l'horloge cardiaque partagée :
 * lub à la phase 0 (fermeture des valves auriculo-ventriculaires),
 * bip du moniteur au pic R (phase 0,30), dub à la phase 0,36 (fermeture aortique).
 */
export function HeartbeatSound() {
  const { mood, soundOn } = useCabinet();
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    if (!soundOn) return;
    let lastBeat = Math.floor(heartClock.update(BPM[moodRef.current]));
    const timer = window.setInterval(() => {
      const beats = heartClock.update(BPM[moodRef.current]);
      const index = Math.floor(beats);
      if (index !== lastBeat) {
        lastBeat = index;
        const period = heartClock.period();
        const now = audio.now;
        const alert = moodRef.current === "warn";
        audio.thump(now, "lub", alert ? 1.1 : 1);
        audio.beep(now + period * 0.3, alert);
        audio.thump(now + period * 0.36, "dub", alert ? 1.1 : 1);
      }
    }, 30);
    return () => window.clearInterval(timer);
  }, [soundOn]);

  return null;
}
