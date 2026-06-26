import assert from "node:assert/strict";
import test from "node:test";
import { isNapoleonDelegationQuestion } from "../src/App.js";

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
});
