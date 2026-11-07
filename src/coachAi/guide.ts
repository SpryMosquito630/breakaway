import type { AppData, Drill } from '../domain/model';
import { assessmentProtocols } from '../domain/assessments';
export function trainingContext(data: AppData, catalog: Drill[]) {
  return { position: data.profile.position ?? 'Still exploring', goal: data.profile.goal,
    plan: data.plan.slice(0,20).map(id => { const d=catalog.find(d=>d.id===id); return {id,name:d?.name ?? id,cue:d?.cue ?? ''}; }),
    sessionHistory: data.history.slice(-8).map(({date,seconds,done,total,completed})=>({date,seconds,done,total,completed})),
    selfReportedTests: (data.assessments??[]).slice(-12).map(({date,skill,value})=>({date,skill,value,measure:assessmentProtocols[skill].measure})),
    allowedDrillIds: catalog.slice(0,100).map(d=>d.id) };
}
export function localGuide(message: string, data: AppData, catalog: Drill[]) {
  const query=message.toLowerCase();
  if (/test|score|assess|progress/.test(query)) {
    const tests=(data.assessments??[]).slice(-3);
    return tests.length ? 'Your latest self-reported tests: '+tests.map(t=>`${assessmentProtocols[t.skill].title}: ${t.value} ${assessmentProtocols[t.skill].measure} (${t.date.slice(0,10)})`).join('; ')+'. These are manual test results, not video measurements. Repeat the same setup to compare.' : 'You have no saved skill assessments yet. Open Retest to record a baseline using the instructions for that test.';
  }
  if (/session|history|complete|week/.test(query)) {
    const count=data.history.filter(h=>h.completed).length;
    return `You have ${count} completed saved sessions across ${data.history.length} saved sessions. Your training goal is ${data.profile.goal}. Completion records describe practice activity, not measured skill improvement.`;
  }
  const plan=data.plan.map(id=>catalog.find(d=>d.id===id)).filter((d): d is Drill=>Boolean(d));
  return plan.length ? `Your ${data.profile.goal} plan includes ${plan.slice(0,4).map(d=>d.name).join(', ')}. Start with ${plan[0].name}: ${plan[0].cue} Your planned session is ${data.profile.minutes} minutes. Use the drill instructions and stop if you feel pain.` : 'Your plan has no available drills. Open the drill library to choose a practice drill. I can summarize your plan, saved sessions and self-reported tests.';
}
