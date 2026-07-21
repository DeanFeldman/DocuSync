"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  existingOutputPaths,
  validateOutputs,
  writeOutputs,
} = require("../save-service.cjs");

test("validates and writes only safe text outputs", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "docsync-save-test-"));
  try {
    const outputs = [
      { file_name: "Building A.txt", content: "Alpha" },
      { file_name: "Building B.txt", content: "Beta" },
    ];
    assert.equal(validateOutputs(outputs).length, 2);
    const paths = await writeOutputs(directory, outputs);
    assert.equal(paths.length, 2);
    assert.equal(await fs.readFile(path.join(directory, "Building A.txt"), "utf8"), "Alpha");
    assert.deepEqual(await existingOutputPaths(directory, outputs), paths);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejects path traversal, non-text files and duplicate names", () => {
  assert.throws(
    () => validateOutputs([{ file_name: "../outside.txt", content: "x" }]),
    /unsafe filename/,
  );
  assert.throws(
    () => validateOutputs([{ file_name: "payload.exe", content: "x" }]),
    /unsafe filename/,
  );
  assert.throws(
    () => validateOutputs([
      { file_name: "Same.txt", content: "x" },
      { file_name: "same.txt", content: "y" },
    ]),
    /duplicated/,
  );
});
