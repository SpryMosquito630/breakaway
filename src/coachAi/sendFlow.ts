import type { AgeBand } from "../domain/model";

type Gate = {
  enabled: boolean;
  age?: AgeBand;
  connected?: boolean;
  pairRequired?: boolean;
  paired?: boolean;
  consentKey?: string;
};
/** A queued, explicit send can cross setup steps, but is consumed only once. */
export class CoachSendFlow {
  question: string | null = null;
  private approvedKey: string | null = null;

  queue(question: string) {
    this.question = question.trim() || null;
  }
  next(gate: Gate) {
    if (!this.question) return "idle";
    if (!gate.enabled) return "offline";
    if (!gate.connected) return "connect";
    if (gate.pairRequired && !gate.paired) return "pair";
    if (!gate.consentKey || this.approvedKey !== gate.consentKey) return "consent";
    return "send";
  }
  approve(key: string) {
    this.approvedKey = key;
  }
  take(key: string) {
    if (!key || this.approvedKey !== key) return null;
    const question = this.question;
    this.question = null;
    return question;
  }
  cancel() {
    this.question = null;
  }
  reset() {
    this.question = null;
    this.approvedKey = null;
  }
}
