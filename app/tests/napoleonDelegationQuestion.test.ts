import assert from "node:assert/strict";
import test from "node:test";
import { describeNapoleonReturnedProofNextStep, isNapoleonDelegationQuestion } from "../src/App.js";

test("recognizes capability-use follow-ups as returned-proof delegation questions", () => {
  assert.equal(isNapoleonDelegationQuestion("Which capability did Napoleon use?"), true);
});

test("recognizes outcome follow-ups as returned-proof delegation questions", () => {
  assert.equal(isNapoleonDelegationQuestion("What happened next?"), true);
  assert.equal(isNapoleonDelegationQuestion("What happened after that?"), true);
  assert.equal(isNapoleonDelegationQuestion("What happens now?"), true);
  assert.equal(isNapoleonDelegationQuestion("What was the outcome?"), true);
});

test("recognizes next-action follow-ups as returned-proof delegation questions", () => {
  assert.equal(isNapoleonDelegationQuestion("What should happen next?"), true);
  assert.equal(isNapoleonDelegationQuestion("What should I do next?"), true);
  assert.equal(isNapoleonDelegationQuestion("What is the next step?"), true);
  assert.equal(isNapoleonDelegationQuestion("Now what?"), true);
  assert.equal(isNapoleonDelegationQuestion("What next?"), true);
  assert.equal(isNapoleonDelegationQuestion("Next step?"), true);
});

test("describes returned-proof next steps by governance outcome without granting approval", () => {
  assert.equal(
    describeNapoleonReturnedProofNextStep("allow_prepare_only"),
    "Treat this as prepared advisory output only; use returned trace and audit references for review before any external action.",
  );
  assert.equal(
    describeNapoleonReturnedProofNextStep("requires_review"),
    "Review the returned Napoleon governance state and blocked effects before treating this as actionable.",
  );
  assert.equal(
    describeNapoleonReturnedProofNextStep("deny"),
    "Do not act on this response; use the returned governance, trace, audit, and blocked effects for Napoleon review or a revised request.",
  );
  assert.equal(
    describeNapoleonReturnedProofNextStep("no_go"),
    "Do not act on this response; use the returned governance, trace, audit, and blocked effects for Napoleon review or a revised request.",
  );
});
