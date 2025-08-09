
export function musclesForExercise(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes("bank")) return ["chest", "triceps", "front_delts"];
  if (n.includes("überkopf") || n.includes("overhead") || n.includes("shoulder"))
    return ["front_delts", "triceps", "upper_chest"];
  if (n.includes("rudern")) return ["mid_back", "lats", "rear_delts", "biceps"];
  if (n.includes("latzug")) return ["lats", "biceps", "rear_delts"];
  if (n.includes("seitheben")) return ["side_delts"];
  if (n.includes("bizeps")) return ["biceps"];
  if (n.includes("hammer")) return ["brachialis", "forearms"];
  if (n.includes("trizeps")) return ["triceps"];
  return [];
}
