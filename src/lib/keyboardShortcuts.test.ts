import test from "node:test";
import assert from "node:assert/strict";
import { isEditableTarget } from "./keyboardShortcuts.ts";

test("isEditableTarget: null target is not editable", () => {
  assert.equal(isEditableTarget(null), false);
});

test("isEditableTarget: input/textarea/select tags are editable", () => {
  assert.equal(isEditableTarget({ tagName: "input" }), true);
  assert.equal(isEditableTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isEditableTarget({ tagName: "select" }), true);
});

test("isEditableTarget: a plain element is not editable", () => {
  assert.equal(isEditableTarget({ tagName: "DIV" }), false);
});

test("isEditableTarget: contentEditable wins regardless of tag", () => {
  assert.equal(isEditableTarget({ tagName: "DIV", isContentEditable: true }), true);
});
