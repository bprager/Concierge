import { useState } from "react";
import {
  buildGovernanceReviewState,
  buildMemoryProposalReviewState,
  buildRehearsalPreview,
  buildTextTurnContract,
  defaultChiefOfStaffDescriptor,
  transitionMemoryProposalReviewState,
  validateChiefOfStaffDescriptor,
  type LocalProfile,
  type MemoryProposalReviewState,
} from "./contractBridge";
import { sendToNapoleon } from "./napoleonBridge";
import {
  describeGovernanceDecision,
  describeGovernanceReview,
  describeMemoryProposalReview,
  summarizeRehearsalPreview,
} from "./presentation";
import { emitEvent, newTraceId } from "./telemetry";
import type { ConciergeMessage } from "./types";

const conversationId = `conv_${Date.now().toString(16)}`;

interface PendingRehearsal {
  content: string;
  traceId: string;
  turnId: string;
  preview: ReturnType<typeof buildRehearsalPreview>;
  summary: ReturnType<typeof summarizeRehearsalPreview>;
  review: ReturnType<typeof describeGovernanceReview>;
  memoryReviewState: MemoryProposalReviewState;
  memoryReview: ReturnType<typeof describeMemoryProposalReview> | null;
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
  const [lastReview, setLastReview] = useState<ReturnType<typeof describeGovernanceReview> | null>(null);
  const [lastMemoryReviewState, setLastMemoryReviewState] = useState<MemoryProposalReviewState | null>(null);
  const [lastMemoryReview, setLastMemoryReview] = useState<ReturnType<typeof describeMemoryProposalReview> | null>(null);
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
    const review = describeGovernanceReview(preview.governanceReview);
    const memoryReviewState = preview.memoryProposal;
    const memoryReview = memoryReviewState.status === "none" ? null : describeMemoryProposalReview(memoryReviewState);

    emitEvent("rehearsal_preview_created", {
      traceId,
      conversationId,
      turnId,
      profile,
      requestId: preview.chiefOfStaffReviewPacket.requestId,
    });
    if (memoryReview) {
      emitEvent("memory_proposal_review_created", {
        traceId,
        conversationId,
        turnId,
        proposalId: memoryReviewState.proposalId,
        memoryWritePerformed: memoryReviewState.memoryWritePerformed,
        approvalCaptured: memoryReviewState.approvalCaptured,
      });
    }
    setPendingRehearsal({ content, traceId, turnId, preview, summary, review, memoryReviewState, memoryReview });
    setLastDecision(null);
    setLastReview(null);
    setLastMemoryReviewState(null);
    setLastMemoryReview(null);
  }

  async function submit(rehearsal: PendingRehearsal | null = null) {
    const content = rehearsal?.content ?? input.trim();
    if (!content) return;
    if (rehearsal && !rehearsal.preview.governanceReview.canSendAdvisory) {
      setLastReview(rehearsal.review);
      return;
    }

    const traceId = rehearsal?.traceId ?? newTraceId();
    const turnId = rehearsal?.turnId ?? `turn_${Date.now().toString(16)}`;
    if (!rehearsal) {
      const preflight = buildTextTurnContract({ message: content, profile, conversationId, turnId, traceId });
      const reviewState = buildGovernanceReviewState(preflight.governanceDecision, profile);
      if (!reviewState.canSendAdvisory) {
        const reviewView = describeGovernanceReview(reviewState);
        emitEvent("governance_review_blocked", {
          traceId,
          conversationId,
          turnId,
          outcome: reviewState.outcome,
          decisionId: reviewState.decisionId,
        });
        setLastReview(reviewView);
        setLastDecision(
          describeGovernanceDecision({
            outcome: reviewState.outcome,
            decisionId: reviewState.decisionId,
            auditId: reviewState.auditId,
            blockedEffects: reviewState.blockedEffects,
          }),
        );
        return;
      }
    }

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
      const memoryContract = buildTextTurnContract({
        message: content,
        profile,
        conversationId,
        turnId,
        traceId,
        governanceOutcome: response.governanceDecision.outcome,
      });
      const memoryReviewState = buildMemoryProposalReviewState(memoryContract, content);

      emitEvent("response_generated", {
        traceId,
        conversationId,
        turnId,
        responseType: "text",
        governanceOutcome: response.governanceDecision.outcome,
        auditId: response.auditEnvelope.audit_id,
      });
      setLastDecision(decisionView);
      setLastReview(describeGovernanceReview(buildGovernanceReviewState(response.governanceDecision, profile)));
      if (memoryReviewState.status === "none") {
        setLastMemoryReviewState(null);
        setLastMemoryReview(null);
      } else {
        setLastMemoryReviewState(memoryReviewState);
        setLastMemoryReview(describeMemoryProposalReview(memoryReviewState));
        emitEvent("memory_proposal_review_created", {
          traceId,
          conversationId,
          turnId,
          proposalId: memoryReviewState.proposalId,
          memoryWritePerformed: memoryReviewState.memoryWritePerformed,
          approvalCaptured: memoryReviewState.approvalCaptured,
        });
      }
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

  function acknowledgePendingReview() {
    if (!pendingRehearsal || !pendingRehearsal.preview.governanceReview.canAcknowledge) return;
    const acknowledgedReview = buildGovernanceReviewState(
      {
        decision_id: pendingRehearsal.preview.traceAuditPreview.decisionId,
        request_id: pendingRehearsal.preview.traceAuditPreview.requestId,
        outcome: pendingRehearsal.preview.governanceReview.outcome,
        authority_tier: pendingRehearsal.preview.governanceReview.authorityTier,
        approval_requirement: pendingRehearsal.preview.governanceReview.approvalRequirement,
        rationale: pendingRehearsal.preview.governanceReview.rationale,
        blocked_effects: pendingRehearsal.preview.governanceReview.blockedEffects,
        trace_id: pendingRehearsal.preview.governanceReview.traceId,
        audit_id: pendingRehearsal.preview.traceAuditPreview.auditId,
      },
      profile,
      true,
    );
    const review = describeGovernanceReview(acknowledgedReview);
    setPendingRehearsal({ ...pendingRehearsal, review });
    emitEvent("governance_review_acknowledged_locally", {
      traceId: pendingRehearsal.traceId,
      conversationId,
      turnId: pendingRehearsal.turnId,
      decisionId: acknowledgedReview.decisionId,
      approvalCaptured: acknowledgedReview.approvalCaptured,
    });
  }

  function updatePendingMemoryReview(status: "acknowledged_locally" | "dismissed_locally") {
    if (!pendingRehearsal) return;
    const updated = transitionMemoryProposalReviewState(pendingRehearsal.memoryReviewState, status);
    const memoryReview = describeMemoryProposalReview(updated);
    setPendingRehearsal({ ...pendingRehearsal, memoryReviewState: updated, memoryReview });
    emitEvent(status === "acknowledged_locally" ? "memory_proposal_acknowledged_locally" : "memory_proposal_dismissed_locally", {
      traceId: pendingRehearsal.traceId,
      conversationId,
      turnId: pendingRehearsal.turnId,
      proposalId: updated.proposalId,
      memoryWritePerformed: updated.memoryWritePerformed,
      approvalCaptured: updated.approvalCaptured,
      localReview: updated.localReview,
    });
  }

  function acknowledgeLastReview() {
    if (!lastReview || !lastReview.canAcknowledge) return;
    setLastReview({
      ...lastReview,
      heading: "Review acknowledged locally",
      body:
        "This local acknowledgement is not Napoleon approval. It does not execute side effects, write memory, send externally, or dispatch agents.",
      actionLabel: "Acknowledged locally",
      canAcknowledge: false,
    });
  }

  function updateLastMemoryReview(status: "acknowledged_locally" | "dismissed_locally") {
    if (!lastMemoryReviewState) return;
    const updated = transitionMemoryProposalReviewState(lastMemoryReviewState, status);
    setLastMemoryReviewState(updated);
    setLastMemoryReview(describeMemoryProposalReview(updated));
    emitEvent(status === "acknowledged_locally" ? "memory_proposal_acknowledged_locally" : "memory_proposal_dismissed_locally", {
      traceId: updated.traceId,
      conversationId,
      proposalId: updated.proposalId,
      memoryWritePerformed: updated.memoryWritePerformed,
      approvalCaptured: updated.approvalCaptured,
      localReview: updated.localReview,
    });
  }

  const canSendRehearsal = Boolean(
    pendingRehearsal &&
      input.trim() === pendingRehearsal.content &&
      pendingRehearsal.preview.governanceReview.canSendAdvisory,
  );

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

      {lastReview ? (
        <section className={`review ${lastReview.sendBlocked ? "blocked" : ""}`}>
          <div className="review-heading">
            <strong>{lastReview.heading}</strong>
            <span>{lastReview.body}</span>
          </div>
          <dl>
            {lastReview.details.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          <button className="secondary" disabled={!lastReview.canAcknowledge} onClick={acknowledgeLastReview}>
            {lastReview.actionLabel}
          </button>
        </section>
      ) : null}

      {lastMemoryReview ? (
        <section className="memory-review">
          <div className="review-heading">
            <strong>{lastMemoryReview.heading}</strong>
            <span>{lastMemoryReview.body}</span>
          </div>
          <dl>
            {lastMemoryReview.details.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          <div className="review-actions">
            <button
              className="secondary"
              disabled={!lastMemoryReview.canAcknowledge}
              onClick={() => updateLastMemoryReview("acknowledged_locally")}
            >
              {lastMemoryReview.actionLabel}
            </button>
            <button
              className="secondary"
              disabled={!lastMemoryReview.canDismiss}
              onClick={() => updateLastMemoryReview("dismissed_locally")}
            >
              {lastMemoryReview.dismissLabel}
            </button>
          </div>
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
          <section className={`review inline ${pendingRehearsal.review.sendBlocked ? "blocked" : ""}`}>
            <div className="review-heading">
              <strong>{pendingRehearsal.review.heading}</strong>
              <span>{pendingRehearsal.review.body}</span>
            </div>
            <dl>
              {pendingRehearsal.review.details.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
            <button className="secondary" disabled={!pendingRehearsal.review.canAcknowledge} onClick={acknowledgePendingReview}>
              {pendingRehearsal.review.actionLabel}
            </button>
          </section>
          {pendingRehearsal.memoryReview ? (
            <section className="memory-review inline">
              <div className="review-heading">
                <strong>{pendingRehearsal.memoryReview.heading}</strong>
                <span>{pendingRehearsal.memoryReview.body}</span>
              </div>
              <dl>
                {pendingRehearsal.memoryReview.details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="review-actions">
                <button
                  className="secondary"
                  disabled={!pendingRehearsal.memoryReview.canAcknowledge}
                  onClick={() => updatePendingMemoryReview("acknowledged_locally")}
                >
                  {pendingRehearsal.memoryReview.actionLabel}
                </button>
                <button
                  className="secondary"
                  disabled={!pendingRehearsal.memoryReview.canDismiss}
                  onClick={() => updatePendingMemoryReview("dismissed_locally")}
                >
                  {pendingRehearsal.memoryReview.dismissLabel}
                </button>
              </div>
            </section>
          ) : null}
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
