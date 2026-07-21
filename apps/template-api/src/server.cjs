"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");
const { ValidationError, renderTemplateBatch } = require("./template-engine.cjs");

const API_VERSION = "1.0.0";
const MAX_REQUEST_BYTES = 1_000_000;
const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/src/app.js", [path.join("src", "app.js"), "text/javascript; charset=utf-8"]],
  ["/src/workflow.mjs", [path.join("src", "workflow.mjs"), "text/javascript; charset=utf-8"]],
]);

const SECURITY_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function secureTokenMatches(expected, supplied) {
  if (!expected) return true;
  if (typeof supplied !== "string") return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Request body must contain valid JSON."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function serveStatic(response, uiDirectory, pathname) {
  const staticEntry = STATIC_FILES.get(pathname);
  if (!staticEntry || !uiDirectory) return false;
  const [relativePath, contentType] = staticEntry;
  const filePath = path.join(uiDirectory, relativePath);
  if (!fs.existsSync(filePath)) return false;
  response.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(response);
  return true;
}

function createTemplateServer({ sessionToken = "", uiDirectory = null } = {}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/api/v1/health") {
      sendJson(response, 200, { status: "ok", api_version: API_VERSION });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/render") {
      if (!secureTokenMatches(sessionToken, request.headers["x-docsync-session"])) {
        sendJson(response, 401, {
          error: { code: "UNAUTHORISED", message: "The desktop session token is missing or invalid.", details: [] },
        });
        return;
      }
      if (!(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
        sendJson(response, 415, {
          error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Use application/json for render requests.", details: [] },
        });
        return;
      }
      try {
        const body = await readJsonBody(request);
        sendJson(response, 200, renderTemplateBatch(body));
      } catch (error) {
        if (error instanceof ValidationError) {
          sendJson(response, 422, {
            error: { code: error.code, message: error.message, details: error.details },
          });
          return;
        }
        if (error && Number.isInteger(error.statusCode)) {
          sendJson(response, error.statusCode, {
            error: { code: "INVALID_BODY", message: error.message, details: [] },
          });
          return;
        }
        sendJson(response, 500, {
          error: { code: "INTERNAL_ERROR", message: "The template could not be rendered.", details: [] },
        });
      }
      return;
    }

    if (request.method === "GET" && serveStatic(response, uiDirectory, url.pathname)) return;

    sendJson(response, 404, {
      error: { code: "NOT_FOUND", message: "The requested resource was not found.", details: [] },
    });
  });
}

module.exports = { API_VERSION, MAX_REQUEST_BYTES, createTemplateServer };
