export function hasForbiddenSideEffectTextClaim(text: unknown): boolean {
  if (typeof text !== "string") return false;

  const assertedText = text
    .split(/[.!?;\n]+/)
    .filter((sentence) => !/\b(did not|didn't|does not|has not|have not|not|no)\b/i.test(sentence))
    .join(". ");

  return [
    /\b(wrote|written|saved|stored|committed)\s+(?:to\s+)?memory\b/i,
    /\b(captured|recorded)\s+approval\b/i,
    /\b(approved|authorized)\s+(?:it|this|that|the\s+(?:plan|proposal|request|change|action|approval\s+packet))\b/i,
    /\b(dispatched|called|ran|invoked)\s+(?:an?\s+)?agent\b/i,
    /\b(applied|implemented)\s+(?:the\s+)?(?:change|proposal|plan|it)\s+locally\b/i,
    /\b(deleted|removed)\s+(?:it|this|that|the\s+(?:file|message|draft|record|entry|item|proposal|request|summary))\b/i,
    /\b(bought|purchased|ordered|paid\s+for)\s+(?:it|this|that|the\s+(?:item|order|subscription|purchase|ticket|service|plan))\b/i,
    /\b(saved|stored|committed)\s+(?:it|this|that|the\s+(?:plan|proposal|summary|message|draft|response))\b/i,
    /\b(scheduled|booked)\s+(?:it|this|that|the\s+(?:meeting|appointment|event|calendar\s+event|call))\b/i,
    /\b(sent|emailed|posted|published|shared|delivered|submitted|forwarded)\b.{0,80}\b(externally|outside|email|message|deployment summary)\b/i,
    /\b(sent|emailed|posted|published|shared|delivered|submitted|forwarded)\s+(?:it|this|that|the\s+(?:plan|proposal|summary|message|draft|response))\b/i,
  ].some((pattern) => pattern.test(assertedText));
}
