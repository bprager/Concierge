import assert from "node:assert/strict";
import test from "node:test";
import { buildGovernedVoicePipelinePlan, exportGovernedVoicePipelineProofJson } from "../src/voicePipelinePlan.js";

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

test("exports a sanitized governed voice pipeline proof without raw prompt endpoint or secret fields", () => {
  const plan = buildGovernedVoicePipelinePlan({ profileMode: "child_protected_user" });
  const json = exportGovernedVoicePipelineProofJson(plan, {
    generatedAt: "2026-06-16T00:00:00.000Z",
    conversationId: "conv_voice_pipeline",
  });
  const proof = JSON.parse(json) as {
    kind: string;
    generatedAt: string;
    conversationId: string;
    voicePipeline: {
      proposalOnly: boolean;
      profileMode: string;
      childProtected: boolean;
      guardianReviewRequired: boolean;
      canStartLiveVoice: boolean;
      stages: Array<{ id: string; status: string }>;
      blockedEffects: string[];
    };
    boundary: {
      microphoneCaptureStarted: boolean;
      audioPlaybackStarted: boolean;
      rawAudioStored: boolean;
      liveNapoleonContacted: boolean;
      approvalCaptured: boolean;
      memoryWritePerformed: boolean;
      agentDispatchPerformed: boolean;
      externalSendPerformed: boolean;
    };
  };

  assert.equal(proof.kind, "concierge_governed_voice_pipeline_proof");
  assert.equal(proof.generatedAt, "2026-06-16T00:00:00.000Z");
  assert.equal(proof.conversationId, "conv_voice_pipeline");
  assert.equal(proof.voicePipeline.proposalOnly, true);
  assert.equal(proof.voicePipeline.profileMode, "child_protected_user");
  assert.equal(proof.voicePipeline.childProtected, true);
  assert.equal(proof.voicePipeline.guardianReviewRequired, true);
  assert.equal(proof.voicePipeline.canStartLiveVoice, false);
  assert.deepEqual(
    proof.voicePipeline.stages.map((stage) => stage.id),
    ["consent", "capture", "vad", "stt", "governed_bridge", "response_shaping", "tts", "playback"],
  );
  assert.ok(proof.voicePipeline.stages.every((stage) => stage.status === "blocked"));
  assert.ok(proof.voicePipeline.blockedEffects.includes("microphone_capture"));
  assert.equal(proof.boundary.microphoneCaptureStarted, false);
  assert.equal(proof.boundary.audioPlaybackStarted, false);
  assert.equal(proof.boundary.rawAudioStored, false);
  assert.equal(proof.boundary.liveNapoleonContacted, false);
  assert.equal(proof.boundary.approvalCaptured, false);
  assert.equal(proof.boundary.memoryWritePerformed, false);
  assert.equal(proof.boundary.agentDispatchPerformed, false);
  assert.equal(proof.boundary.externalSendPerformed, false);
  for (const forbidden of ["endpoint", "host", "token", "prompt", "message", "requestBody", "responseBody", "rawAudioData"]) {
    assert.equal(json.includes(forbidden), false);
  }
});
