import { allowed, days, goals, type AppData, type Drill, type Profile } from './model';
import { localDateKey, planForDate } from './planning';
export type Playlist = {
    id: string;
    name: string;
    ids: string[];
};
export type TrainingPreferences = {
    pathId?: string;
    weeklyTarget: number;
    matchDays: string[];
};
export type DailyReadiness = {
    date: string;
    energy: 'Low' | 'Usual' | 'High';
    gear: string[];
};
export const keeperDrills: Drill[] = [
    { id: 'keeper-hold', recommendedPositions: ['Goalkeeper'], name: 'Keeper soft catch', skill: 'Ball control', gear: [], space: 'Small space', level: 'New to training', cue: 'Eyes on the ball. Soften the catch.', steps: ['Stand balanced on clear, level ground with room around you.', 'Gently toss the ball from your hands only to face height. Catch it in front of your body with relaxed arms.', 'Bring it toward your chest and reset. Keep both feet grounded; no jumps or dives.'], tip: 'Use gentle self-tosses only. Stop if the ball or surface is slippery.', version: 1 },
    { id: 'keeper-roll', recommendedPositions: ['Goalkeeper'], name: 'Keeper roll distribution', skill: 'Passing', gear: ['partner'], space: 'Open space', level: 'New to training', cue: 'Look at your receiver before rolling.', steps: ['Ask a partner to stand a few walking steps away in a clear lane.', 'Lower the ball close to the ground and roll it gently toward their feet. Stay balanced.', 'Your partner returns a gentle ground pass. Stop it with your foot, pick it up after it stops, then switch rolling hands.'], tip: 'Keep the ball on the ground. No shots, collisions or diving.', version: 1 },
];
export const trainingPaths = [
    { id: 'keeper', name: 'Goalkeeper · hands & distribution', position: 'Goalkeeper', body: 'Gentle handling, passing with both feet and scanning. No diving or shot stopping.', stages: [['keeper-hold', 'pass-brake', 'weak'], ['keeper-hold', 'wall', 'pass-angle'], ['keeper-roll', 'wall-open', 'weak']] },
    { id: 'defender', name: 'Defender · receive & release', position: 'Defender', body: 'Receive into space, scan and play a controlled pass.', stages: [['inside', 'pass-brake', 'weak'], ['wall-open', 'pass-angle', 'turn'], ['partner-first', 'gate-pass', 'carry-scan']] },
    { id: 'midfielder', name: 'Midfielder · scan & connect', position: 'Midfielder', body: 'First touch, open body position and passing with both feet.', stages: [['inside', 'weak', 'pass-angle'], ['wall-open', 'turn', 'gate-pass'], ['partner-first', 'carry-scan', 'partner']] },
    { id: 'forward', name: 'Forward · turn & carry', position: 'Forward', body: 'Close control, changes of direction and a pass after a turn.', stages: [['sole', 'turn', 'weak'], ['carry-scan', 'pass-angle', 'gates'], ['slalom', 'partner-first', 'gate-pass']] },
    { id: 'weak-foot', name: 'Weaker foot · controlled repetition', position: 'Any position', body: 'Start slowly with the less comfortable foot. Precision comes before pace.', stages: [['weak', 'inside', 'pass-brake'], ['weak', 'push', 'turn'], ['weak', 'gate-pass', 'wall-open']] },
] as const;
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const clean = (x: unknown, max: number) => typeof x === 'string' ? x.trim().slice(0, max) : '';
export function sanitizeCustomDrills(value: unknown): Drill[] {
    if (!Array.isArray(value))
        return [];
    const found = new Set<string>();
    return value.slice(0, 40).flatMap(raw => {
        if (!object(raw) || typeof raw.id !== 'string' || !/^custom-[a-zA-Z0-9-]{1,70}$/.test(raw.id) || found.has(raw.id))
            return [];
        const name = clean(raw.name, 80), cue = clean(raw.cue, 180), tip = clean(raw.tip, 240);
        const steps = Array.isArray(raw.steps) ? raw.steps.slice(0, 8).map(x => clean(x, 300)).filter(Boolean) : [];
        if (!name || !cue || !steps.length || !goals.includes(raw.skill as any) || !['Small space', 'Open space'].includes(String(raw.space)) || !['New to training', 'Some experience'].includes(String(raw.level)) || !Array.isArray(raw.gear) || raw.gear.some(g => !['wall', 'markers', 'partner'].includes(String(g))))
            return [];
        found.add(raw.id);
        return [{ id: raw.id, name, cue, tip, steps, skill: String(raw.skill), space: String(raw.space), level: String(raw.level), gear: [...new Set(raw.gear as string[])], version: Number.isSafeInteger(raw.version) && Number(raw.version) > 0 ? Number(raw.version) : 1 }];
    });
}
export function combinedCatalog(base: Drill[], data: Pick<AppData, 'customDrills'>): Drill[] {
    const ids = new Set(base.map(d => d.id));
    return [...base, ...keeperDrills.filter(d => !ids.has(d.id)), ...sanitizeCustomDrills(data.customDrills).filter(d => !ids.has(d.id))];
}
export function sanitizeTrainingFields(raw: Record<string, any>, catalog: Drill[]) {
    const known = (id: unknown): id is string => typeof id === 'string' && catalog.some(d => d.id === id);
    raw.favorites = Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter(known))].slice(0, 100) : [];
    const seen = new Set<string>();
    raw.playlists = Array.isArray(raw.playlists) ? raw.playlists.slice(0, 20).flatMap((p: unknown) => {
        if (!object(p) || !/^playlist-[a-zA-Z0-9-]{1,70}$/.test(String(p.id)) || seen.has(String(p.id)) || !clean(p.name, 80) || !Array.isArray(p.ids))
            return [];
        const ids = [...new Set(p.ids.filter(known))].slice(0, 8);
        if (!ids.length)
            return [];
        seen.add(String(p.id));
        return [{ id: String(p.id), name: clean(p.name, 80), ids }];
    }) : [];
    const t = raw.trainingPreferences;
    raw.trainingPreferences = object(t) ? { weeklyTarget: Number.isInteger(t.weeklyTarget) && Number(t.weeklyTarget) >= 1 && Number(t.weeklyTarget) <= 7 ? Number(t.weeklyTarget) : raw.profile.days.length, matchDays: Array.isArray(t.matchDays) ? [...new Set(t.matchDays.filter((d: unknown) => days.includes(String(d))))] : [], ...(trainingPaths.some(p => p.id === t.pathId) ? { pathId: t.pathId } : {}) } : undefined;
    const r = raw.dailyReadiness;
    raw.dailyReadiness = object(r) && typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && localDateKey(new Date(`${r.date}T12:00:00`)) === r.date && ['Low', 'Usual', 'High'].includes(String(r.energy)) && Array.isArray(r.gear) && r.gear.every(g => ['markers', 'wall', 'partner'].includes(String(g))) ? { date: r.date, energy: r.energy, gear: [...new Set(r.gear)] } : undefined;
}
export function profileForToday(data: AppData, now = new Date()): Profile {
    return data.dailyReadiness?.date === localDateKey(now) ? { ...data.profile, gear: data.dailyReadiness.gear } : data.profile;
}
export function weeklyReview(data: AppData, now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const recent = data.history.filter(h => h.seconds > 0 && new Date(h.date) >= start && new Date(h.date) <= now);
    const complete = recent.filter(h => h.completed);
    const count = new Set(complete.map(h => localDateKey(new Date(h.date)))).size;
    const hard = recent.filter(h => h.effort === 'Challenging').length;
    const easy = complete.filter(h => h.effort === 'Easy').length;
    const target = data.trainingPreferences?.weeklyTarget ?? data.profile.days.length;
    const minutes = hard >= 2 ? (data.profile.minutes === 30 ? 20 : data.profile.minutes === 20 ? 15 : 10) : data.profile.minutes;
    return { count, target, minutes, seconds: recent.reduce((n, h) => n + h.seconds, 0), message: !recent.length ? 'Your review starts after your first logged practice.' : hard >= 2 ? 'Two or more sessions felt challenging. Try a shorter session and keep the pace comfortable.' : count < target ? 'Keep the next session manageable. Missed days do not need to be made up.' : easy >= 2 ? 'You completed two Easy sessions. Eligible drill stages can progress; your weekly time stays the same.' : 'Keep your current routine and review how the next sessions feel.' };
}
export function pathStage(data: AppData, now = new Date()) {
    const path = data.trainingPreferences?.pathId;
    const selected = trainingPaths.find(p => p.id === path);
    if (!selected)
        return 0;
    const pathIds = new Set<string>(selected.stages.flat());
    const completed = data.history.filter(h => h.completed && h.seconds > 0 && new Date(h.date) <= now && h.drills?.some(r => pathIds.has(r.id) && r.status === 'done' && r.seconds > 0));
    return Math.min(2, Math.floor(completed.length / 3));
}
export function trainingPlanToday(data: AppData, catalog: Drill[], now = new Date()) {
    const profile = profileForToday(data, now);
    const path = trainingPaths.find(p => p.id === data.trainingPreferences?.pathId);
    const base = planForDate(catalog, profile, data.plan, now, data.planCustomized);
    // An explicitly edited plan always takes precedence over a selected path.
    if (data.planCustomized)
        return base.filter(id => catalog.some(d => d.id === id && allowed(d, profile)));
    const preferred = path ? [...path.stages[pathStage(data, now)]] : [];
    const focus = base.filter(id => catalog.find(d => d.id === id)?.skill === profile.goal).slice(0, 2);
    return [...new Set([...focus, ...preferred, ...base])].filter(id => catalog.some(d => d.id === id && allowed(d, profile))).slice(0, 3);
}
export function playlistIssues(ids: string[], catalog: Drill[], profile: Profile) {
    if (!ids.length)
        return ['Choose at least one drill.'];
    if (ids.length > 8)
        return ['A playlist can contain up to 8 drills.'];
    return ids.flatMap(id => { const d = catalog.find(d => d.id === id); return !d ? ['A drill is no longer available.'] : !allowed(d, profile) ? [`${d.name}: requires ${d.space.toLowerCase()}${d.gear.length ? ' and ' + d.gear.join(', ') : ''}.`] : []; });
}
export function deleteCustomDrill(data: AppData, id: string): AppData {
    // Keep execution, manual-plan and playlist references intact until the user edits them.
    if (data.active?.ids.includes(id) || data.plan.includes(id) || data.playlists?.some(p => p.ids.includes(id)))
        return data;
    return { ...data, customDrills: data.customDrills?.filter(d => d.id !== id), favorites: data.favorites?.filter(x => x !== id) };
}
