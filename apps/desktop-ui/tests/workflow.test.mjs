import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkflowError,
  buildRenderRequest,
  createInitialState,
  extractPlaceholderNames,
  normaliseApiError,
  reconcileRecords,
} from "../src/workflow.mjs";

test("initial workflow contains two renderable records", () => {
  const state = createInitialState();
  const request = buildRenderRequest(state);
  assert.equal(request.records.length, 2);
  assert.deepEqual(extractPlaceholderNames(request.template), [
    "centre_name",
    "reporting_date",
    "manager_name",
  ]);
});

test("reconciles record values when template fields change", () => {
  const records = [{ id: "1", name: "A", values: { old: "kept out", shared: "kept" } }];
  assert.deepEqual(reconcileRecords(records, ["shared", "new"])[0].values, {
    shared: "kept",
    new: "",
  });
});

test("client validation explains missing record values", () => {
  const state = createInitialState();
  state.records[1].values.manager_name = "";
  assert.throws(
    () => buildRenderRequest(state),
    (error) => {
      assert.ok(error instanceof WorkflowError);
      assert.ok(error.details.some((detail) => detail.includes("Building B") && detail.includes("manager name")));
      return true;
    },
  );
});

test("normalises structured API errors for the accessible alert", () => {
  const error = normaliseApiError({
    error: {
      message: "Record is incomplete.",
      details: [{ record: "Building B", field: "manager_name" }],
    },
  }, 422);
  assert.equal(error.message, "Record is incomplete.");
  assert.deepEqual(error.details, ["Building B: enter manager name."]);
});
