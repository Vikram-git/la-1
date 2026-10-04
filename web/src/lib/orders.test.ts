import { test } from "node:test";
import assert from "node:assert/strict";
import { searchEverywhere } from "./orders.ts";

test("the top-bar search looks in both lists and every status; the list's own search box stays in its list", () => {
  assert.equal(searchEverywhere("Priya", "all"), true);
  assert.equal(searchEverywhere("9000012301", "all"), true);
  assert.equal(searchEverywhere("", "all"), false);
  assert.equal(searchEverywhere("Priya", ""), false);
  assert.equal(searchEverywhere("Priya", "something"), false);
});
