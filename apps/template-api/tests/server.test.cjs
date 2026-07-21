"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { once } = require("node:events");
const { createTemplateServer } = require("../src/server.cjs");

async function withServer(run) {
  const server = createTemplateServer({ sessionToken: "test-session" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("health endpoint reports the versioned API", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", api_version: "1.0.0" });
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  });
});

test("render endpoint requires the desktop session token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "UNAUTHORISED");
  });
});

test("render endpoint returns generated outputs and structured validation errors", async () => {
  await withServer(async (baseUrl) => {
    const headers = {
      "Content-Type": "application/json",
      "X-DocSync-Session": "test-session",
    };
    const valid = await fetch(`${baseUrl}/api/v1/render`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        template_name: "Greeting",
        template: "Hello {{name}}",
        records: [
          { name: "A", values: { name: "Alice" } },
          { name: "B", values: { name: "Bob" } },
        ],
      }),
    });
    assert.equal(valid.status, 200);
    assert.deepEqual((await valid.json()).outputs.map((item) => item.content), ["Hello Alice", "Hello Bob"]);

    const invalid = await fetch(`${baseUrl}/api/v1/render`, {
      method: "POST",
      headers,
      body: JSON.stringify({ template_name: "Broken", template: "Hello {{name}}", records: [] }),
    });
    assert.equal(invalid.status, 422);
    const error = (await invalid.json()).error;
    assert.equal(error.code, "NOT_ENOUGH_RECORDS");
    assert.ok(error.message.includes("at least two"));
  });
});
