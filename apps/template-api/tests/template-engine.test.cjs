"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  ValidationError,
  extractPlaceholders,
  renderTemplateBatch,
  safeOutputBaseName,
} = require("../src/template-engine.cjs");

const validRequest = {
  template_name: "Monthly notice",
  template: "Hello {{centre_name}}. Your manager is {{manager_name}}.",
  records: [
    { name: "Building A", values: { centre_name: "Building A", manager_name: "Amina" } },
    { name: "Building B", values: { centre_name: "Building B", manager_name: "Ben" } },
  ],
};

test("extracts unique placeholders in template order", () => {
  assert.deepEqual(
    extractPlaceholders("{{first}} {{ second }} {{first}}"),
    ["first", "second"],
  );
});

test("renders one deterministic output per record", () => {
  const result = renderTemplateBatch(validRequest);
  assert.equal(result.generated_count, 2);
  assert.deepEqual(result.placeholders, ["centre_name", "manager_name"]);
  assert.equal(result.outputs[0].file_name, "Building A.txt");
  assert.equal(result.outputs[0].content, "Hello Building A. Your manager is Amina.");
  assert.equal(result.outputs[1].content, "Hello Building B. Your manager is Ben.");
});

test("reports missing values with record and field details", () => {
  const request = structuredClone(validRequest);
  request.records[1].values.manager_name = "";
  assert.throws(
    () => renderTemplateBatch(request),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.code, "MISSING_VALUES");
      assert.deepEqual(error.details, [{ record: "Building B", field: "manager_name" }]);
      return true;
    },
  );
});

test("requires at least two records and one placeholder", () => {
  assert.throws(
    () => renderTemplateBatch({ ...validRequest, records: validRequest.records.slice(0, 1) }),
    (error) => error.code === "NOT_ENOUGH_RECORDS",
  );
  assert.throws(
    () => renderTemplateBatch({ ...validRequest, template: "Plain text" }),
    (error) => error.code === "NO_PLACEHOLDERS",
  );
});

test("creates Windows-safe output names", () => {
  assert.equal(safeOutputBaseName('Care:Centre/West*', "Fallback"), "Care-Centre-West-");
  assert.equal(safeOutputBaseName("CON", "Fallback"), "CON-record");
});
