export type ConciergeRole = "user" | "assistant";

export interface ConciergeMessage {
  role: ConciergeRole;
  content: string;
}

export interface NapoleonRequest {
  traceId: string;
  profile: string;
  channel: "text" | "voice" | "avatar";
  message: string;
}

export interface NapoleonResponse {
  text: string;
  governanceDecision?: string;
  targetAgent?: string;
  stance?: string;
}
