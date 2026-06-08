import { useState } from "react";
import {
  buildRehearsalPreview,
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
  validateChiefOfStaffDescriptor,
  type LocalProfile,
} from "./contractBridge";
import { sendToNapoleon } from "./napoleonBridge";
import { describeGovernanceDecision, summarizeRehearsalPreview } from "./presentation";
import { emitEvent, newTraceId } from "./telemetry";
import type { ConciergeMessage } from "./types";

const conversationId = `conv_${Date.now().toString(16)}`;

interface PendingRehearsal {
  content: string;
  traceId: string;
  turnId: string;
  preview: ReturnType<typeof buildRehearsalPreview>;
  summary: ReturnType<typeof summarizeRehearsalPreview>;
}

export function App() {
  const [messages, setMessages] = useState<ConciergeMessage[]>([
    {
      role: "assistant",
      content: "Text Concierge is ready in prepare-only mode. Camera and microphone are off.",
    },
  ]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<LocalProfile>("adult_owner");
  const [rehearsalMode, setRehearsalMode] = useState(true);
  const [pendingRehearsal, setPendingRehearsal] = useState<PendingRehearsal | null>(null);
  const [endpoint, setEndpoint] = useState(() =>
    typeof localStorage === "undefined" ? "" : localStorage.getItem("napoleon_endpoint") ?? "",
  );
  const [lastDecision, setLastDecision] = useState<ReturnType<typeof describeGovernanceDecision> | null>(null);
  const descriptorStatus = validateChiefOfStaffDescriptor(defaultChiefOfStaffDescriptor);

  function updateEndpoint(value: string) {
    setEndpoint(value);
    if (typeof localStorage === "undefined") return;
    if (value.trim()) {
      localStorage.setItem("napoleon_endpoint", value.trim());
    } else {
      localStorage.removeItem("napoleon_endpoint");
    }
  }

  function updateProfile(value: LocalProfile) {
    setProfile(value);
    setPendingRehearsal(null);
  }

  function updateInput(value: string) {
    setInput(value);
    setPendingRehearsal(null);
  }

  function rehearse() {
    const content = input.trim();
    if (!content) return;

    const traceId = newTraceId();
    const turnId = `turn_${Date.now().toString(16)}`;
    const contract = buildTextTurnContract({
      message: content,
      profile,
      conversationId,
      turnId,
      traceId,
    });
    const preview = buildRehearsalPreview(contract, content);
    const summary = summarizeRehearsalPreview(preview);

    emitEvent("rehearsal_preview_created", {
      traceId,
      conversationId,
      turnId,
      profile,
      requestId: preview.chiefOfStaffReviewPacket.requestId,
    });
    setPendingRehearsal({ content, traceId, turnId, preview, summary });
    setLastDecision(null);
  }

  async function submit(rehearsal: PendingRehearsal | null = null) {
    const content = rehearsal?.content ?? input.trim();
    if (!content) return;

    const traceId = rehearsal?.traceId ?? newTraceId();
    const turnId = rehearsal?.turnId ?? `turn_${Date.now().toString(16)}`;
    emitEvent("user_message_received", { traceId, conversationId, turnId, channel: "text", profile });

    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setPendingRehearsal(null);

    try {
      const response = await sendToNapoleon({
        traceId,
        conversationId,
        turnId,
        profile,
        channel: "text",
        message: content,
      });

      const decisionView = describeGovernanceDecision({
        outcome: response.governanceDecision.outcome,
        decisionId: response.governanceDecision.decision_id,
        auditId: response.auditEnvelope.audit_id,
        blockedEffects: response.governanceDecision.blocked_effects,
      });

      emitEvent("response_generated", {
        traceId,
        conversationId,
        turnId,
        responseType: "text",
        governanceOutcome: response.governanceDecision.outcome,
        auditId: response.auditEnvelope.audit_id,
      });
      setLastDecision(decisionView);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: response.text,
          metadata: {
            governanceOutcome: response.governanceDecision.outcome,
            decisionId: response.governanceDecision.decision_id,
            auditId: response.auditEnvelope.audit_id,
            profileMode: response.profileMode,
            blockedEffects: response.governanceDecision.blocked_effects,
          },
        },
      ]);
    } catch (error) {
      emitEvent("response_failed", { traceId, conversationId, turnId, error: String(error) });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Napoleon bridge failed. Concierge did not execute anything and remains in prepare-only mode.",
        },
      ]);
    }
  }

  const canSendRehearsal = Boolean(pendingRehearsal && input.trim() === pendingRehearsal.content);

  return (
    <main className="shell">
      <header>
        <h1>Concierge</h1>
        <p>Text mode. Chief of Staff contracts are enforced as prepare-only boundaries.</p>
      </header>

      <section className="settings">
        <label>
          User profile
          <select value={profile} onChange={(e) => updateProfile(e.target.value as LocalProfile)}>
            <option value="adult_owner">Adult owner</option>
            <option value="child_protected">Child protected</option>
            <option value="guest">Guest</option>
          </select>
        </label>
        <label>
          Napoleon endpoint
          <input
            value={endpoint}
            onChange={(e) => updateEndpoint(e.target.value)}
            placeholder="Optional live endpoint"
          />
        </label>
        <label>
          Rehearsal Mode
          <input
            type="checkbox"
            checked={rehearsalMode}
            onChange={(e) => {
              setRehearsalMode(e.target.checked);
              setPendingRehearsal(null);
            }}
          />
        </label>
        <span className="capture">Camera off, microphone off</span>
      </section>

      <section className="contract-status">
        <div>
          <strong>Chief of Staff</strong>
          <span>{descriptorStatus.serviceId}</span>
        </div>
        <div>
          <strong>Descriptor</strong>
          <span>{descriptorStatus.ready ? "valid, contract-only" : "not valid"}</span>
        </div>
        <div>
          <strong>Runtime authority</strong>
          <span>{descriptorStatus.runtimeAuthority ? "enabled" : "blocked"}</span>
        </div>
        <div>
          <strong>Cache policy</strong>
          <span>{descriptorStatus.cachePolicy}</span>
        </div>
      </section>

      <section className="messages">
        {messages.map((m, i) => (
          <article key={i} className={m.role}>
            <strong>{m.role}</strong>
            <p>{m.content}</p>
            {m.metadata ? (
              <dl>
                <dt>Governance</dt>
                <dd>{m.metadata.governanceOutcome}</dd>
                <dt>Profile mode</dt>
                <dd>{m.metadata.profileMode}</dd>
                <dt>Decision</dt>
                <dd>{m.metadata.decisionId}</dd>
                <dt>Audit</dt>
                <dd>{m.metadata.auditId}</dd>
              </dl>
            ) : null}
          </article>
        ))}
      </section>

      {lastDecision ? (
        <section className="governance">
          <strong>{lastDecision.status}</strong>
          <p>{lastDecision.detail}</p>
          <span>Blocked effects: {lastDecision.blockedEffectsLabel}</span>
        </section>
      ) : null}

      {pendingRehearsal ? (
        <section className="rehearsal">
          <div className="rehearsal-heading">
            <strong>{pendingRehearsal.summary.status}</strong>
            <span>{pendingRehearsal.summary.detail}</span>
          </div>
          <dl>
            <dt>Understood request</dt>
            <dd>{pendingRehearsal.preview.understoodRequest}</dd>
            <dt>Proposed path</dt>
            <dd>{pendingRehearsal.preview.proposedNapoleonPath.join(" -> ")}</dd>
            <dt>Chief of Staff packet</dt>
            <dd>
              {pendingRehearsal.preview.chiefOfStaffReviewPacket.requestId},{" "}
              {pendingRehearsal.preview.chiefOfStaffReviewPacket.profileMode},{" "}
              {pendingRehearsal.preview.chiefOfStaffReviewPacket.authorityTier}
            </dd>
            <dt>Allowed</dt>
            <dd>{pendingRehearsal.preview.allowedEffects.join(", ")}</dd>
            <dt>Blocked</dt>
            <dd>{pendingRehearsal.preview.blockedEffects.join(", ")}</dd>
            <dt>Approval</dt>
            <dd>{pendingRehearsal.summary.approval}</dd>
            <dt>Memory proposal</dt>
            <dd>{pendingRehearsal.summary.memory}</dd>
            <dt>Trace and audit</dt>
            <dd>
              {pendingRehearsal.preview.traceAuditPreview.traceId},{" "}
              {pendingRehearsal.preview.traceAuditPreview.auditId}
            </dd>
            <dt>Evaluator case</dt>
            <dd>
              {pendingRehearsal.preview.evaluatorCaseCandidate.scenarioType},{" "}
              {pendingRehearsal.preview.evaluatorCaseCandidate.sourceRequestId}
            </dd>
          </dl>
        </section>
      ) : null}

      <section className="composer">
        <textarea
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          placeholder="Ask Napoleon through Concierge..."
        />
        <div className="composer-actions">
          <button onClick={rehearsalMode ? rehearse : () => submit()}>
            {rehearsalMode ? "Rehearse" : "Send"}
          </button>
          {rehearsalMode ? (
            <button className="secondary" disabled={!canSendRehearsal} onClick={() => submit(pendingRehearsal)}>
              Send advisory request
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}
