export function hasForbiddenSideEffectTextClaim(text: unknown): boolean {
  if (typeof text !== "string") return false;

  const assertedText = text
    .split(/[.!?;\n]+/)
    .filter((sentence) => !/\b(did not|didn't|does not|has not|have not|not|no)\b/i.test(sentence))
    .join(". ");

  return [
    /\b(wrote|written|saved|stored|committed)\s+(?:to\s+)?memory\b/i,
    /\b(captured|recorded)\s+approval\b/i,
    /\b(dispatched|called|ran|invoked)\s+(?:an?\s+)?agent\b/i,
    /\b(applied|implemented)\s+(?:the\s+)?(?:change|proposal|plan|it)\s+locally\b/i,
    /\b(sent|emailed|posted|published|shared|delivered)\b.{0,80}\b(externally|outside|email|message|deployment summary)\b/i,
    /\b(sent|emailed|posted|published|shared|delivered)\s+(?:it|this|that|the\s+(?:plan|proposal|summary|message|draft|response))\b/i,
  ].some((pattern) => pattern.test(assertedText));
}
