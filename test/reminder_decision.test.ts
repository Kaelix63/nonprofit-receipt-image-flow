import assert from "node:assert/strict";
import test from "node:test";
import { shouldSendVolunteerReminder } from "../src/nonprofit_receipt_flow.js";

test("a volunteer shift within one day is included with the receipt report", () => {
  const now = new Date("2026-12-14T10:00:00.000Z");
  assert.equal(shouldSendVolunteerReminder("2026-12-15T09:00:00.000Z", now), true);
  assert.equal(shouldSendVolunteerReminder("2026-12-16T10:00:00.000Z", now), false);
});
