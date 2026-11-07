import { createLocalStore } from '../features/localStore';
import { initialCoach, restoreCoach, type CoachData } from './persistence';
export { initialCoach, restoreCoach, type CoachData } from './persistence';
export const coachStore=createLocalStore<CoachData>({key:'breakaway-coach-v1',initial:initialCoach,restore:restoreCoach});
