export type Goal = 'Passing' | 'Control' | 'Teamwork';
export type CoachRequest = { goal: Goal; minutes: number; players: number; equipment: string[]; intensity: 'Gentle' | 'Moderate'; notes: string };
export type Activity = { id: string; title: string; goals: Goal[]; min: number; max: number; gear: string[]; setup: string; steps: string[]; points: string[]; mistakes: string[]; diagram: 'pair' | 'circle' | 'game' };
export const activities: Activity[] = [
 {id:'touch', title:'Controlled touches',goals:['Control'],min:1,max:2,gear:['Ball'],setup:'One ball per active player. Use a clear 4 × 4 m area; partners take turns.',steps:['Walk with soft inside-foot touches.','Stop the ball with the sole, look up, then change direction.','Switch after 45 seconds and take a short rest.'],points:['Keep the ball within one step.','Use both feet at a comfortable pace.'],mistakes:['Looking down continuously.','Taking touches too far away.'],diagram:'pair'},
 {id:'pair',title:'Pass and move',goals:['Passing','Teamwork','Control'],min:2,max:4,gear:['Ball'],setup:'Pairs 4–6 m apart in a clear area. One ball per pair; larger groups rotate in pairs.',steps:['Roll a ground pass to your partner.','Receive across the body and return with the other foot.','After passing, move one step sideways to offer a new angle.'],points:['Look before passing.','Match pass speed to your partner.'],mistakes:['Standing still after the pass.','Passing before a partner is ready.'],diagram:'pair'},
 {id:'circle',title:'Moving passing circle',goals:['Passing','Teamwork','Control'],min:5,max:16,gear:['Ball','Markers'],setup:'Mark a 10–16 m circle. For 9–16 players split into two circles; one ball per circle.',steps:['Pass on the ground to an available teammate.','Move to a different free space after passing.','Receiver calls a name and opens their body before the next pass.'],points:['Keep passing lanes open.','Start slowly, then add movement only when control is consistent.'],mistakes:['Everyone moving toward the ball.','Passes without eye contact.'],diagram:'circle'},
 {id:'possession',title:'Possession with a neutral',goals:['Teamwork','Passing','Control'],min:5,max:15,gear:['Ball','Markers','Bibs'],setup:'Mark a 16 × 20 m area. Split into equal sides; with an odd number add one neutral who helps the team in possession. For even numbers play equal sides.',steps:['Keep possession with ground passes and controlled movement.','After a turnover, change direction and find a free teammate.','Rotate neutral and rest roles every two minutes.'],points:['Spread out to offer two passing options.','Use short rounds with water breaks.'],mistakes:['Crowding the receiver.','High or forceful challenges.'],diagram:'game'},
 {id:'endzone',title:'End-zone team game',goals:['Teamwork','Passing','Control'],min:6,max:22,gear:['Ball','Markers','Bibs'],setup:'Mark a 20 × 30 m area with a 3 m end zone at each end. Split equally; odd player is a neutral. For more than 14, use two pitches with one ball each.',steps:['Score by receiving a controlled ground pass inside the opposing end zone.','Restart from your end after a point.','Rotate neutral roles and pause for water every three minutes.'],points:['Move into space before receiving.','Adjust area and pace for the group.'],mistakes:['Waiting inside the scoring zone.','Unsafe contact or chasing into adjacent pitches.'],diagram:'game'},
];
export type CoachSession = { id: string; created: string; request: CoachRequest; activityIds: string[]; favorite: boolean; checked: string[] };
export function generateSession(request: CoachRequest, random = Math.random): CoachSession {
 if (!Number.isInteger(request.players) || request.players < 1 || request.players > 22) throw Error('Choose 1–22 players.');
 if (![15,30,45,60,75,90].includes(request.minutes)) throw Error('Choose a supported session length.');
 if (!['Passing','Control','Teamwork'].includes(request.goal) || !['Gentle','Moderate'].includes(request.intensity)) throw Error('Choose a supported goal and intensity.');
 if(request.notes.length>500) throw Error('Keep notes under 500 characters.');
 const eligible = activities.filter(a=>a.goals.includes(request.goal)&&request.players>=a.min&&request.players<=a.max&&a.gear.every(g=>request.equipment.includes(g)));
 if (!eligible.length) throw Error('No curated activity fits these constraints. Adjust player count, goal, or available equipment. Nothing was added automatically.');
 const shuffled=[...eligible].sort((a,b)=>a.id.localeCompare(b.id));
 const offset=Math.min(shuffled.length-1,Math.max(0,Math.floor(random()*shuffled.length)));
 const chosen=[...shuffled.slice(offset),...shuffled.slice(0,offset)].slice(0,3);
 return {id:`session-${Date.now()}-${Math.floor(random()*1e8)}`,created:new Date().toISOString(),request:{...request,notes:request.notes.trim()},activityIds:chosen.map(a=>a.id),favorite:false,checked:[]};
}
export const attributes=['Pace','Passing','Control','Shooting','Defending','Stamina','Vision','Keeping'] as const;
export type Player = { id:string; name:string; role:'Keeper'|'Defender'|'Midfielder'|'Forward'; ratings:number[] };
export type Constraint = { a:string; b:string; kind:'Together'|'Apart' };
export type Teams = { a:string[]; b:string[]; difference:number; keepers:[string,string] };
export type Match = {id:string;groupId:string;date:string;side:number;formation:string;rsvp:Record<string,'Yes'|'No'|'Maybe'>;teams:Teams;score:[number,number]|null;goals:Record<string,number>;saves:Record<string,number>;mvp:string|null;repeat:'None'|'Weekly'|'Fortnightly'};
export type Group = {id:string;name:string;players:Player[];constraints:Constraint[]};
export function validatePlayer(p:Player){return !!p.id&&p.name.trim().length>0&&p.name.length<=40&&['Keeper','Defender','Midfielder','Forward'].includes(p.role)&&p.ratings.length===8&&p.ratings.every(n=>Number.isInteger(n)&&n>=1&&n<=10);}
export function validateDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function strength(p:Player){return p.ratings.reduce((a,b)=>a+b,0)/8;}
export function balanceScore(a:Player[],b:Player[]){let score=Math.abs(a.reduce((s,p)=>s+strength(p),0)/a.length-b.reduce((s,p)=>s+strength(p),0)/b.length);for(const role of ['Keeper','Defender','Midfielder','Forward'])score+=Math.abs(a.filter(p=>p.role===role).length-b.filter(p=>p.role===role).length)*.35;return Math.round(score*100)/100;}
export function constraintsHold(a:string[],b:string[],constraints:Constraint[]){return constraints.every(c=>{const x=a.includes(c.a),y=a.includes(c.b);return (a.includes(c.a)||b.includes(c.a))&&(a.includes(c.b)||b.includes(c.b))&&(c.kind==='Together'?x===y:x!==y);});}
export function keeperFor(ids:string[],players:Player[],history:Match[]){const counts=new Map<string,number>();for(const m of history)for(const id of m.teams.keepers)counts.set(id,(counts.get(id)||0)+1);return [...ids].sort((x,y)=>(counts.get(x)||0)-(counts.get(y)||0)||(players.find(p=>p.id===y)?.ratings[7]||0)-(players.find(p=>p.id===x)?.ratings[7]||0)||x.localeCompare(y))[0];}
export function generateTeams(players:Player[],constraints:Constraint[],history:Match[]=[],side=5):Teams[]{
 if(![5,6,7,8,11].includes(side))throw Error('Choose 5, 6, 7, 8 or 11 a side.');
 if(players.length!==side*2)throw Error(`Select exactly ${side*2} available players. Odd counts need a substitute; unselect that player before generating.`);
 if(players.some(p=>!validatePlayer(p))||new Set(players.map(p=>p.id)).size!==players.length)throw Error('Player records need valid unique aliases and eight ratings from 1–10.');
 const ids=players.map(p=>p.id), strengths=players.map(strength), roleNames=['Keeper','Defender','Midfielder','Forward'];
 const roles=players.map(p=>roleNames.indexOf(p.role));
 const totalStrength=strengths.reduce((n,v)=>n+v,0), totalRoles=roleNames.map(r=>players.filter(p=>p.role===r).length);
 const rules=constraints.map(c=>({a:ids.indexOf(c.a),b:ids.indexOf(c.b),kind:c.kind}));
 if(rules.some(c=>c.a<0||c.b<0))throw Error('A mandatory rule references an unavailable player. Edit that rule or attendance.');
 const candidates:{mask:number;difference:number}[]=[];const counts=[0,0,0,0];counts[roles[0]]=1;
 function visit(i:number,count:number,mask:number,sum:number){
  if(count>side||count+ids.length-i<side)return;
  if(i===ids.length){
   if(count!==side||rules.some(c=>c.kind==='Together'?!!(mask&(1<<c.a))!==!!(mask&(1<<c.b)):!!(mask&(1<<c.a))===!!(mask&(1<<c.b))))return;
   let score=Math.abs((2*sum-totalStrength)/side);for(let r=0;r<4;r++)score+=Math.abs(2*counts[r]-totalRoles[r])*.35;
   const difference=Math.round(score*100)/100;
   if(candidates.length===5&&difference>=candidates[4].difference)return;
   candidates.push({mask,difference});candidates.sort((a,b)=>a.difference-b.difference);if(candidates.length>5)candidates.pop();return;
  }
  counts[roles[i]]++;visit(i+1,count+1,mask|(1<<i),sum+strengths[i]);counts[roles[i]]--;visit(i+1,count,mask,sum);
 }
 visit(1,1,1,strengths[0]);
 if(!candidates.length)throw Error('No valid split satisfies every together/apart constraint. Edit the constraints or roster.');
 return candidates.map(({mask,difference})=>{const a=ids.filter((_,i)=>!!(mask&(1<<i))),b=ids.filter((_,i)=>!(mask&(1<<i)));return {a,b,difference,keepers:[keeperFor(a,players,history),keeperFor(b,players,history)]};});
}
export function swapTeams(teams:Teams,x:string,y:string,group:Group,history:Match[]=[]):Teams{if(!teams.a.includes(x)||!teams.b.includes(y))throw Error('Choose one player from each side.');const a=teams.a.map(id=>id===x?y:id),b=teams.b.map(id=>id===y?x:id);if(!constraintsHold(a,b,group.constraints))throw Error('This swap violates a together/apart constraint.');return {a,b,difference:balanceScore(group.players.filter(p=>a.includes(p.id)),group.players.filter(p=>b.includes(p.id))),keepers:[keeperFor(a,group.players,history),keeperFor(b,group.players,history)]};}
export function playerStats(id:string,matches:Match[]){const played=matches.filter(m=>m.score&&[...m.teams.a,...m.teams.b].includes(id));let wins=0,draws=0;for(const m of played){const side=m.teams.a.includes(id)?0:1;if(m.score![side]>m.score![1-side])wins++;if(m.score![0]===m.score![1])draws++;}return {played:played.length,wins,draws,points:wins*3+draws,goals:played.reduce((n,m)=>n+(m.goals[id]||0),0),saves:played.reduce((n,m)=>n+(m.saves[id]||0),0),mvp:played.filter(m=>m.mvp===id).length};}
export const formations:Record<number,string[]>={5:['1-2-1','2-1-1'],6:['2-2-1','1-3-1'],7:['2-3-1','3-2-1'],8:['3-3-1','2-3-2'],11:['4-3-3','4-4-2','3-5-2']};
export type FormationLine={role:string;players:string[]};
/** Greedy position suggestions, honoring preferred roles before role-relevant manual ratings. */
export function formationLines(ids:string[],keeper:string,players:Player[],formation:string):FormationLine[]{
 const counts=formation.split('-').map(Number);if(counts.some(n=>!Number.isInteger(n)||n<1)||counts.reduce((n,v)=>n+v,0)!==ids.length-1)throw Error('Formation does not fit this side.');
 const remaining=ids.filter(id=>id!==keeper);const result:FormationLine[]=[{role:'Keeper',players:[keeper]}];
 counts.forEach((count,i)=>{const role=i===0?'Defender':i===counts.length-1?'Forward':'Midfielder';const weight=(id:string)=>{const p=players.find(p=>p.id===id)!;const indices=role==='Defender'?[4,5,6]:role==='Forward'?[0,2,3]:[1,2,6];return (p.role===role?100:0)+indices.reduce((n,j)=>n+p.ratings[j],0);};remaining.sort((a,b)=>weight(b)-weight(a)||a.localeCompare(b));const selected=remaining.splice(0,count);result.push({role,players:selected});});return result;
}
export function relationshipSummary(id:string,group:Group,matches:Match[]){return group.players.filter(p=>p.id!==id).map(p=>{let together=0,sharedWins=0,opposed=0,lossesAgainst=0;for(const m of matches){if(!m.score||m.groupId!==group.id)continue;const a=m.teams.a.includes(id)?0:m.teams.b.includes(id)?1:-1,b=m.teams.a.includes(p.id)?0:m.teams.b.includes(p.id)?1:-1;if(a<0||b<0)continue;const score=m.score as number[];if(a===b){together++;if(score[a]>score[1-a])sharedWins++;}else{opposed++;if(score[a]<score[1-a])lossesAgainst++;}}return {id:p.id,name:p.name,together,sharedWins,opposed,lossesAgainst};});}
