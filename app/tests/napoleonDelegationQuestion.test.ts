import assert from "node:assert/strict";
import test from "node:test";
import { isNapoleonDelegationQuestion } from "../src/App.js";

test("recognizes capability-use follow-ups as returned-proof delegation questions", () => {
  assert.equal(isNapoleonDelegationQuestion("Which capability did Napoleon use?"), true);
});
