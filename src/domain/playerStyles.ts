import type { Position } from "./model";

/** Stable photo IDs also key the native bundled-image map. Names remain save-compatible. */
export const playerStyles = [
  {
    id: "kevin-de-bruyne",
    name: "Kevin De Bruyne",
    position: "CM · AM",
    role: "ELITE CREATOR",
    description: "Passing, assists, crossing, tempo control.",
    tags: ["Passing", "Crossing", "Tempo"],
  },
  {
    id: "pedri",
    name: "Pedri",
    position: "CM · AM",
    role: "PRESS-RESISTANT MAESTRO",
    description: "First touch, awareness, tight-space passing.",
    tags: ["First touch", "Vision", "Passing"],
  },
  {
    id: "sergio-busquets",
    name: "Sergio Busquets",
    position: "DM",
    role: "DEEP CONTROLLER",
    description: "Positioning, tempo, interceptions.",
    tags: ["Positioning", "Tempo", "Passing"],
  },
  {
    id: "declan-rice",
    name: "Declan Rice",
    position: "DM · CM",
    role: "BALL-WINNING ANCHOR",
    description: "Interceptions, stamina, progressive carries.",
    tags: ["Tackling", "Stamina", "Carrying"],
  },
  {
    id: "erling-haaland",
    name: "Erling Haaland",
    position: "ST",
    role: "EXPLOSIVE FINISHER",
    description: "Runs behind, powerful finishes, penalty-area movement.",
    tags: ["Finishing", "Movement", "Power"],
  },
  {
    id: "harry-kane",
    name: "Harry Kane",
    position: "ST",
    role: "COMPLETE NUMBER NINE",
    description: "Clinical finishing, hold-up play, finding runners.",
    tags: ["Finishing", "Link-up", "Passing"],
  },
  {
    id: "kylian-mbappe",
    name: "Kylian Mbappé",
    position: "LW · ST",
    role: "DIRECT SPEEDSTER",
    description: "Explosive runs, one-on-ones, driving toward goal.",
    tags: ["Pace", "Dribbling", "Finishing"],
  },
  {
    id: "mohamed-salah",
    name: "Mohamed Salah",
    position: "RW",
    role: "INSIDE FORWARD",
    description: "Cutting inside, diagonal runs, composed finishing.",
    tags: ["Movement", "Dribbling", "Finishing"],
  },
  {
    id: "bukayo-saka",
    name: "Bukayo Saka",
    position: "RW · AM",
    role: "CREATIVE WINGER",
    description: "Close control, combination play, chances from wide areas.",
    tags: ["Control", "Creativity", "Crossing"],
  },
  {
    id: "virgil-van-dijk",
    name: "Virgil van Dijk",
    position: "CB",
    role: "COMMANDING DEFENDER",
    description: "Reading danger, aerial duels, calm distribution.",
    tags: ["Positioning", "Aerial play", "Passing"],
  },
  {
    id: "william-saliba",
    name: "William Saliba",
    position: "CB",
    role: "COMPOSED STOPPER",
    description: "One-on-one defending, recovery runs, playing out.",
    tags: ["Tackling", "Recovery", "Composure"],
  },
  {
    id: "jules-kounde",
    name: "Jules Koundé",
    position: "RB · CB",
    role: "VERSATILE BALL-WINNER",
    description: "Quick defensive reactions, close marking, supporting possession.",
    tags: ["Marking", "Agility", "Passing"],
  },
  {
    id: "achraf-hakimi",
    name: "Achraf Hakimi",
    position: "RB · RWB",
    role: "ATTACKING FULLBACK",
    description: "Overlapping runs, recovery pace, creating from wide areas.",
    tags: ["Pace", "Overlapping", "Crossing"],
  },
  {
    id: "trent-alexander-arnold",
    name: "Trent Alexander-Arnold",
    position: "RB",
    role: "WIDE PLAYMAKER",
    description: "Cross-field passes, early crosses, finding space to create.",
    tags: ["Passing", "Crossing", "Vision"],
  },
  {
    id: "manuel-neuer",
    name: "Manuel Neuer",
    position: "GK",
    role: "SWEEPER KEEPER",
    description: "Reading through balls, playing high, confident distribution.",
    tags: ["Anticipation", "Distribution", "Positioning"],
  },
  {
    id: "alisson-becker",
    name: "Alisson Becker",
    position: "GK",
    role: "COMPOSED LAST LINE",
    description: "One-on-one decisions, reliable handling, calm passing.",
    tags: ["Handling", "Decisions", "Passing"],
  },
  {
    id: "thibaut-courtois",
    name: "Thibaut Courtois",
    position: "GK",
    role: "SHOT-STOPPING SPECIALIST",
    description: "Reach, reflex saves, commanding the penalty area.",
    tags: ["Reflexes", "Reach", "Aerial play"],
  },
  {
    id: "andrew-robertson",
    name: "Andrew Robertson",
    position: "LB",
    role: "RELENTLESS OVERLAPPER",
    description: "Supporting runs, early crosses, determined recovery work.",
    tags: ["Stamina", "Crossing", "Overlapping"],
  },
  {
    id: "theo-hernandez",
    name: "Theo Hernández",
    position: "LB · LWB",
    role: "DRIVING FULLBACK",
    description: "Powerful carries, bursts into space, attacking support.",
    tags: ["Carrying", "Pace", "Power"],
  },
  {
    id: "alphonso-davies",
    name: "Alphonso Davies",
    position: "LB · LWB",
    role: "RAPID RECOVERY RUNNER",
    description: "Explosive dribbling, recovery runs, stretching the flank.",
    tags: ["Pace", "Dribbling", "Recovery"],
  },
] as const;
export type PlayerStyle = (typeof playerStyles)[number];
export type PlayerStyleId = PlayerStyle["id"];

// Haaland stays in the catalog for saved-name compatibility, outside visible rosters.
const strikers = ["harry-kane", "kylian-mbappe"] as const;
const wingers = ["kylian-mbappe", "mohamed-salah", "bukayo-saka"] as const;
const creators = ["kevin-de-bruyne", "pedri", "bukayo-saka"] as const;
const midfielders = ["kevin-de-bruyne", "pedri", "declan-rice"] as const;
const anchors = ["sergio-busquets", "declan-rice"] as const;
const centreBacks = ["virgil-van-dijk", "william-saliba", "jules-kounde"] as const;
const leftBacks = ["andrew-robertson", "theo-hernandez", "alphonso-davies"] as const;
const fullbacks = ["achraf-hakimi", "trent-alexander-arnold", "jules-kounde"] as const;
const keepers = ["manuel-neuer", "alisson-becker", "thibaut-courtois"] as const;
const exploring = ["kylian-mbappe", "pedri", "virgil-van-dijk", "manuel-neuer"] as const;
const detailGroups = {
  ST: strikers,
  LW: wingers,
  RW: wingers,
  AM: creators,
  LM: wingers,
  CM: midfielders,
  RM: wingers,
  DM: anchors,
  LB: leftBacks,
  RB: fullbacks,
  CB: centreBacks,
  GK: keepers,
  Exploring: exploring,
} satisfies Record<string, readonly PlayerStyleId[]>;
export type PitchPosition = keyof typeof detailGroups;
export const pitchPositions = Object.keys(detailGroups) as PitchPosition[];
const broadGroups: Record<Position, readonly PlayerStyleId[]> = {
  Forward: ["harry-kane", "kylian-mbappe", "mohamed-salah"],
  Midfielder: midfielders,
  Defender: ["virgil-van-dijk", "andrew-robertson", "achraf-hakimi"],
  Goalkeeper: keepers,
  "Still exploring": exploring,
};

/** Detailed pitch roles lead; old broad-only drafts get a representative fallback. */
export function playerStylesForPosition(
  position?: Position,
  detail?: string,
): PlayerStyle[] {
  const ids =
    detail && Object.hasOwn(detailGroups, detail)
      ? detailGroups[detail as PitchPosition]
      : position
        ? broadGroups[position]
        : exploring;
  return ids.map((id) => playerStyles.find((player) => player.id === id)!);
}
