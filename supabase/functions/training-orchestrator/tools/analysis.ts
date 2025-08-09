
import type { SetEntry } from "./set-parser.ts";
import { musclesForExercise } from "./muscle-map.ts";

export type ExerciseEntry = {
  name: string;
  sets: SetEntry[];
  muscles?: string[];
};

const GROUP_MAP: Record<string, "push" | "pull" | "other"> = {
  chest: "push",
  triceps: "push",
  front_delts: "push",
  upper_chest: "push",
  side_delts: "push",
  lats: "pull",
  biceps: "pull",
  rear_delts: "pull",
  mid_back: "pull",
  brachialis: "pull",
  forearms: "pull"
};

export function calcVolume(exs: ExerciseEntry[]) {
  const byExercise = exs.map((e) => ({
    name: e.name,
    volume: e.sets.reduce((a, s) => a + s.weight * s.reps, 0),
  }));

  const total = Math.round(byExercise.reduce((a, x) => a + x.volume, 0));

  const byMuscle: Record<string, number> = {};
  for (const e of exs) {
    const v = e.sets.reduce((a, s) => a + s.weight * s.reps, 0);
    const muscles = e.muscles && e.muscles.length ? e.muscles : musclesForExercise(e.name);
    for (const m of muscles) byMuscle[m] = (byMuscle[m] ?? 0) + v;
  }

  const push = Object.entries(byMuscle)
    .filter(([m]) => GROUP_MAP[m] === "push")
    .reduce((a, [, v]) => a + v, 0);
  const pull = Object.entries(byMuscle)
    .filter(([m]) => GROUP_MAP[m] === "pull")
    .reduce((a, [, v]) => a + v, 0);

  const balance = push + pull > 0 ? Number(((pull / Math.max(1, push)) as number).toFixed(2)) : 1;

  return {
    total,
    byExercise,
    byMuscle,
    pushPull: { push: Math.round(push), pull: Math.round(pull), ratioPullToPush: balance }
  };
}

export function buildSummaryMarkdown(exs: ExerciseEntry[]) {
  const { total, byExercise, byMuscle, pushPull } = calcVolume(exs);
  const lines = byExercise
    .map((e, i) => {
      const sets = exs[i].sets
        .map((s) => `${s.reps}×${s.weight}kg${s.rpe !== undefined ? ` | RPE ${s.rpe}` : ""}`)
        .join(" · ");
      return `${i + 1}) **${e.name}** — ${sets}`;
    })
    .join("\n");

  const ml = Object.entries(byMuscle)
    .sort((a, b) => b[1] - a[1])
    .map(([m, v]) => `- ${m}: ${Math.round(v)} kg`)
    .join("\n");

  const tip =
    pushPull.ratioPullToPush < 0.8
      ? "Tipp: Beim nächsten Mal 1–2 Zugübungen ergänzen (z. B. Rudern/Face Pulls) für bessere Balance."
      : pushPull.ratioPullToPush > 1.25
      ? "Tipp: Etwas mehr Push‑Volumen einplanen (z. B. Brust/Trizeps), um ausgeglichen zu bleiben."
      : "Gute Push/Pull‑Balance heute – weiter so.";

  return `### Training – Zusammenfassung
${lines}

**Volumen gesamt:** ${total} kg  
**Muskelgruppen-Volumen:**  
${ml}

**Push/Pull:** Pull ${pushPull.pull} kg • Push ${pushPull.push} kg • Verhältnis (Pull/Push): ${pushPull.ratioPullToPush}

${tip}`;
}

