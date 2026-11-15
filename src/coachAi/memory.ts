import type { ChatTurn } from "./conversation";

export type MemoryMessage = { role: "user" | "assistant"; text: string };
export const CHAT_BODY_BYTES = 24000;

export function utf8Bytes(text: string) {
  let bytes = 0;
  for (const character of text) {
    const point = character.codePointAt(0)!;
    bytes += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }
  return bytes;
}

export function buildCoachRequest({
  turns,
  scope,
  provider,
  currentId,
  message,
  context,
  memoryAvailable,
}: {
  turns: ChatTurn[];
  scope: string;
  provider: "gemini" | "openai" | undefined;
  currentId: number | null;
  message: string;
  context: unknown;
  memoryAvailable: boolean;
}) {
  const base = { message, context };
  if (utf8Bytes(JSON.stringify(base)) > CHAT_BODY_BYTES)
    throw Error(
      "Your question and training context are too large. Shorten the question or start a new chat.",
    );
  if (!memoryAvailable) return base;
  const currentIndex = turns.findIndex((turn) => turn.id === currentId);
  const previous = currentIndex < 0 ? turns : turns.slice(0, currentIndex);
  const eligible = previous.filter(
    (turn) =>
      turn.status === "complete" &&
      turn.memoryScope === scope &&
      turn.answer?.source === provider &&
      (provider === "gemini" || provider === "openai"),
  );
  const pairs = eligible.slice(-6).map((turn): MemoryMessage[] => [
    { role: "user", text: turn.question },
    {
      role: "assistant",
      text: JSON.stringify({
        reply: turn.answer!.reply,
        drillIds: turn.answer!.drillIds,
      }),
    },
  ]);
  let history = pairs.flat();
  while (pairs.length) {
    const chars = history.reduce((total, row) => total + row.text.length, 0);
    const bytes = history.reduce((total, row) => total + utf8Bytes(row.text), 0);
    const validMessages = history.every(
      (row) => row.text.trim() && row.text.length <= (row.role === "user" ? 1500 : 3600),
    );
    if (
      validMessages &&
      chars <= 6000 &&
      bytes <= 8000 &&
      utf8Bytes(JSON.stringify({ ...base, history })) <= CHAT_BODY_BYTES
    )
      break;
    pairs.shift();
    history = pairs.flat();
  }
  if (utf8Bytes(JSON.stringify({ ...base, history })) > CHAT_BODY_BYTES) return base;
  return { ...base, history };
}

/** An aborted request cannot write into a conversation started after it. */
export class ChatGeneration {
  value = 0;
  reset() {
    this.value += 1;
  }
  matches(value: number) {
    return this.value === value;
  }
}
