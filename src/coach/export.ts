import {
  activities,
  attributes,
  type CoachSession,
  type Group,
  type Match,
  playerStats,
  formationLines,
} from "./domain";
export function escapeHTML(value: unknown) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
export function documentHTML(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font:15px -apple-system,Arial,sans-serif;color:#14231c;padding:28px}h1{color:#0c4a34}h2{margin-top:26px}li{margin:7px 0}section{break-inside:avoid}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #bbb;text-align:left}small{color:#45564b}</style></head><body><h1>${escapeHTML(title)}</h1>${body}</body></html>`;
}
export function sessionHTML(s: CoachSession) {
  return documentHTML(
    `${s.request.goal} practice`,
    `<p>${s.request.minutes} minutes · ${s.request.players} players · ${escapeHTML(s.request.intensity)}</p><p>Offline curated session. Original starter content; not coach reviewed. Stop for pain, dizziness, unsafe conditions or fatigue. Ground-ball practice only; no heading or contact drills.</p><p>Equipment: ${s.request.equipment.map(escapeHTML).join(", ")}</p><p>${escapeHTML(s.request.notes)}</p><p>Gentle: 45 seconds movement / 45 seconds rest. Moderate: 60 seconds movement / 30 seconds rest. Stop or extend rests for fatigue.</p><p>Start with 3 minutes of easy movement; finish with 2 minutes walking. Include water and rest within each activity block.</p>${s.activityIds
      .map((id, i) => {
        const a = activities.find((x) => x.id === id)!;
        return `<section><h2>${escapeHTML(a.title)} · ${Math.floor((s.request.minutes - 5) / s.activityIds.length) + (i === 0 ? (s.request.minutes - 5) % s.activityIds.length : 0)} min</h2><p>${escapeHTML(a.setup)}</p><ol>${a.steps.map((x) => `<li>${escapeHTML(x)}</li>`).join("")}</ol><p>Coach: ${a.points.map(escapeHTML).join(" · ")}</p><p>Watch for: ${a.mistakes.map(escapeHTML).join(" · ")}</p></section>`;
      })
      .join(
        "",
      )}<small>Reference: FIFA Training Centre grassroots principles, https://www.fifatrainingcentre.com/en/practice/grassroots.php. Instructions and diagrams independently authored.</small>`,
  );
}
export function lineupHTML(group: Group, m: Match) {
  return documentHTML(
    `${group.name} · ${m.date}`,
    `<p>${m.side} a side · ${escapeHTML(m.formation)} plus keeper · Balance difference ${m.teams.difference.toFixed(2)}</p><table><tr><th>Side A</th><th>Side B</th></tr>${m.teams.a.map((id, i) => `<tr><td>${escapeHTML(group.players.find((p) => p.id === id)?.name || "Removed player")}${id === m.teams.keepers[0] ? " (GK)" : ""}</td><td>${escapeHTML(group.players.find((p) => p.id === m.teams.b[i])?.name || "Removed player")}${m.teams.b[i] === m.teams.keepers[1] ? " (GK)" : ""}</td></tr>`).join("")}</table>${lineupSVG(group, m)}<p>Local organizer records. Ratings and attendance are manually entered; no invitations were sent.</p>`,
  );
}
/** Neutralize spreadsheet formulas as well as quoting CSV delimiters. */
export function csvCell(value: unknown) {
  let s = String(value);
  if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
export function groupCSV(group: Group, matches: Match[]) {
  return [
    [
      "Alias",
      "Role",
      ...attributes,
      "Played",
      "Wins",
      "Draws",
      "Points",
      "Goals",
      "Saves",
      "MVP",
    ],
    ...group.players.map((p) => {
      const s = playerStats(
        p.id,
        matches.filter((m) => m.groupId === group.id),
      );
      return [
        p.name,
        p.role,
        ...p.ratings,
        s.played,
        s.wins,
        s.draws,
        s.points,
        s.goals,
        s.saves,
        s.mvp,
      ];
    }),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
/** Vector image generated locally; aliases are escaped as SVG text. */
export function lineupSVG(group: Group, m: Match) {
  const w = 720,
    h = 1040;
  const lines = m.formation.split("-").map(Number);
  function side(ids: string[], keeper: string, offset: number) {
    const field = formationLines(ids, keeper, group.players, m.formation)
      .slice(1)
      .flatMap((line) => line.players);
    const positions: { id: string; x: number; y: number }[] = [
      { id: keeper, x: 360, y: offset + 195 },
    ];
    let cursor = 0;
    lines.forEach((count, row) => {
      for (let i = 0; i < count; i++)
        positions.push({
          id: field[cursor++],
          x: 60 + (600 / (count + 1)) * (i + 1),
          y: offset + 155 - row * (125 / Math.max(1, lines.length - 1)),
        });
    });
    return positions
      .map(
        ({ id, x, y }) =>
          `<circle cx="${x}" cy="${y}" r="17" fill="#0c4a34"/><text x="${x}" y="${y + 34}" text-anchor="middle" font-size="16" fill="#14231c">${escapeHTML((group.players.find((p) => p.id === id)?.name || "Player").slice(0, 18))}</text>`,
      )
      .join("");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="720" height="1040" fill="#f6f7f5"/><text x="40" y="55" font-size="28" font-family="Arial" fill="#14231c">${escapeHTML(group.name.slice(0, 35))}</text><text x="40" y="90" font-size="20" font-family="Arial" fill="#14231c">${escapeHTML(m.date)} · ${m.side} a side · ${escapeHTML(m.formation)} + GK</text><rect x="25" y="130" width="670" height="740" rx="12" fill="#e1ede5" stroke="#0c4a34"/><line x1="25" y1="500" x2="695" y2="500" stroke="#0c4a34"/><text x="45" y="165" font-size="22" fill="#14231c">SIDE A</text>${side(m.teams.a, m.teams.keepers[0], 210)}<text x="45" y="540" font-size="22" fill="#14231c">SIDE B</text>${side(m.teams.b, m.teams.keepers[1], 585)}<text x="40" y="930" font-size="18" fill="#14231c">Breakaway · Local organizer lineup</text><text x="40" y="965" font-size="16" fill="#14231c">Formation positions are a starting arrangement, not tracked locations.</text></svg>`;
}
