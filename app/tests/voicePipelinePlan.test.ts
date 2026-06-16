import assert from "node:assert/strict";
import test from "node:test";
import { buildGovernedVoicePipelinePlan } from "../src/voicePipelinePlan.js";

interface VoicePipelinePlanStageView {
  id: string;
  status: string;
  authorityBoundary: string;
  requiredProof: string;
}

test("builds a proposal-only governed voice pipeline plan without side effects", () => {
  const plan = buildGovernedVoicePipelinePlan({ profileMode: "adult_owner" });

  assert.equal(plan.proposalOnly, true);
  assert.equal(plan.canStartLiveVoice, false);
  assert.equal(plan.microphoneCaptureStarted, false);
  assert.equal(plan.audioPlaybackStarted, false);
  assert.equal(plan.rawAudioStored, false);
  assert.equal(plan.liveNapoleonContacted, false);
  assert.equal(plan.approvalCaptured, false);
  assert.equal(plan.memoryWritePerformed, false);
  assert.equal(plan.agentDispatchPerformed, false);
  assert.equal(plan.externalSendPerformed, false);
  assert.deepEqual(
    plan.stages.map((stage: VoicePipelinePlanStageView) => stage.id),
    ["consent", "capture", "vad", "stt", "governed_bridge", "response_shaping", "tts", "playback"],
  );
  assert.ok(plan.stages.every((stage: VoicePipelinePlanStageView) => stage.status === "blocked"));
  assert.ok(
    plan.stages
      .find((stage: VoicePipelinePlanStageView) => stage.id === "governed_bridge")
      ?.authorityBoundary.includes("governed bridge"),
  );
  assert.ok(plan.blockedEffects.includes("microphone_capture"));
  assert.ok(plan.blockedEffects.includes("live_napoleon_contact"));
});

test("adds stricter child protected constraints to the governed voice pipeline plan", () => {
  const plan = buildGovernedVoicePipelinePlan({ profileMode: "child_protected_user" });

  assert.equal(plan.childProtected, true);
  assert.ok(plan.guardianReviewRequired);
  assert.ok(plan.authorityBoundary.includes("guardian"));
  assert.ok(
    plan.stages.some(
      (stage: VoicePipelinePlanStageView) =>
        stage.id === "consent" && stage.requiredProof.includes("guardian review"),
    ),
  );
  assert.equal(plan.canStartLiveVoice, false);
});
