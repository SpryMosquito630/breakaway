export const COACH_CONTEXT_CHARACTERS = 16000;
export type CoachTrainingContext = {
  position: string;
  goal: string;
  plan: { id: string; name: string; cue: string }[];
  allowedDrillIds: string[];
};

/** Matches Python json.dumps defaults for this string-only catalog context. */
export function pythonContextCharacters(value: CoachTrainingContext): number {
  const json = JSON.stringify(value);
  let length = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < json.length; index++) {
    const character = json[index];
    // ensure_ascii=True escapes each non-ASCII UTF-16 unit, including emoji pairs.
    length += json.charCodeAt(index) >= 0x7f ? 6 : 1;
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === "," || character === ":") length++;
  }
  return length;
}
