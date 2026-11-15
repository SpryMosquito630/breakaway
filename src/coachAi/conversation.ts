import type { CoachReply } from "./recommendations";

export type ChatTurn = {
  id: number;
  question: string;
  status: "queued" | "sending" | "failed" | "complete";
  note?: string;
  answer?: CoachReply;
  /** Memory-only identity scope. Never serialize this credential-derived value. */
  memoryScope?: string;
};

/** Retries keep the original user bubble instead of appending duplicates. */
export function queueChatTurn(
  turns: ChatTurn[],
  id: number,
  question: string,
): ChatTurn[] {
  const turn: ChatTurn = { id, question, status: "queued", note: "Connecting…" };
  return turns.some((item) => item.id === id)
    ? turns.map((item) => (item.id === id ? turn : item))
    : [...turns.slice(-19), turn];
}

export function updateChatTurn(
  turns: ChatTurn[],
  id: number | null,
  update: Partial<Pick<ChatTurn, "status" | "note" | "answer" | "memoryScope">>,
): ChatTurn[] {
  return turns.map((turn) => (turn.id === id ? { ...turn, ...update } : turn));
}
