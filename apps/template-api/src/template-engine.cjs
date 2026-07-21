"use strict";

const PLACEHOLDER_PATTERN = /{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g;
const FIELD_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const LIMITS = Object.freeze({
  maxTemplateCharacters: 100_000,
  maxRecords: 100,
  maxFields: 50,
  maxRecordNameCharacters: 120,
  maxValueCharacters: 10_000,
});

class ValidationError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
    this.details = details;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractPlaceholders(template) {
  const names = [];
  const seen = new Set();
  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      names.push(match[1]);
    }
  }
  return names;
}

function safeOutputBaseName(name, fallback) {
  let cleaned = String(name)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 100);
  if (!cleaned) cleaned = fallback;
  if (WINDOWS_RESERVED_NAMES.test(cleaned)) cleaned = `${cleaned}-record`;
  return cleaned;
}

function validateRenderRequest(input) {
  if (!isPlainObject(input)) {
    throw new ValidationError("INVALID_REQUEST", "The request body must be a JSON object.");
  }

  const templateName = typeof input.template_name === "string"
    ? input.template_name.trim()
    : "Untitled template";
  if (!templateName || templateName.length > 200) {
    throw new ValidationError(
      "INVALID_TEMPLATE_NAME",
      "Template name must contain between 1 and 200 characters.",
    );
  }

  if (typeof input.template !== "string" || !input.template.trim()) {
    throw new ValidationError("INVALID_TEMPLATE", "Template text is required.");
  }
  if (input.template.length > LIMITS.maxTemplateCharacters) {
    throw new ValidationError(
      "TEMPLATE_TOO_LARGE",
      `Template text may contain at most ${LIMITS.maxTemplateCharacters.toLocaleString()} characters.`,
    );
  }

  const placeholders = extractPlaceholders(input.template);
  if (placeholders.length === 0) {
    throw new ValidationError(
      "NO_PLACEHOLDERS",
      "Add at least one named placeholder such as {{centre_name}}.",
    );
  }
  if (placeholders.length > LIMITS.maxFields) {
    throw new ValidationError(
      "TOO_MANY_FIELDS",
      `A template may contain at most ${LIMITS.maxFields} unique placeholders.`,
    );
  }

  if (!Array.isArray(input.records) || input.records.length < 2) {
    throw new ValidationError(
      "NOT_ENOUGH_RECORDS",
      "Add at least two records before generating outputs.",
    );
  }
  if (input.records.length > LIMITS.maxRecords) {
    throw new ValidationError(
      "TOO_MANY_RECORDS",
      `A generation may contain at most ${LIMITS.maxRecords} records.`,
    );
  }

  const recordNames = new Set();
  const records = input.records.map((record, index) => {
    if (!isPlainObject(record)) {
      throw new ValidationError(
        "INVALID_RECORD",
        `Record ${index + 1} must be an object.`,
      );
    }
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name || name.length > LIMITS.maxRecordNameCharacters) {
      throw new ValidationError(
        "INVALID_RECORD_NAME",
        `Record ${index + 1} needs a name of 1–${LIMITS.maxRecordNameCharacters} characters.`,
      );
    }
    if (recordNames.has(name.toLocaleLowerCase())) {
      throw new ValidationError("DUPLICATE_RECORD_NAME", `Record name “${name}” is duplicated.`);
    }
    recordNames.add(name.toLocaleLowerCase());

    if (!isPlainObject(record.values)) {
      throw new ValidationError("INVALID_RECORD_VALUES", `Record “${name}” needs field values.`);
    }

    const values = {};
    const missing = [];
    for (const placeholder of placeholders) {
      const value = record.values[placeholder];
      if (typeof value !== "string" || !value.trim()) {
        missing.push(placeholder);
        continue;
      }
      if (value.length > LIMITS.maxValueCharacters) {
        throw new ValidationError(
          "VALUE_TOO_LARGE",
          `Field “${placeholder}” in record “${name}” exceeds ${LIMITS.maxValueCharacters.toLocaleString()} characters.`,
        );
      }
      values[placeholder] = value;
    }
    if (missing.length > 0) {
      throw new ValidationError(
        "MISSING_VALUES",
        `Record “${name}” is missing required values.`,
        missing.map((field) => ({ record: name, field })),
      );
    }

    for (const key of Object.keys(record.values)) {
      if (!FIELD_NAME_PATTERN.test(key)) {
        throw new ValidationError("INVALID_FIELD_NAME", `Field name “${key}” is not valid.`);
      }
    }

    return { name, values };
  });

  return { templateName, template: input.template, placeholders, records };
}

function renderTemplateBatch(input) {
  const validated = validateRenderRequest(input);
  const usedFileNames = new Set();
  const outputs = validated.records.map((record, index) => {
    const content = validated.template.replace(
      PLACEHOLDER_PATTERN,
      (_match, fieldName) => record.values[fieldName],
    );
    const baseName = safeOutputBaseName(record.name, `Record-${index + 1}`);
    let fileName = `${baseName}.txt`;
    let suffix = 2;
    while (usedFileNames.has(fileName.toLocaleLowerCase())) {
      fileName = `${baseName}-${suffix}.txt`;
      suffix += 1;
    }
    usedFileNames.add(fileName.toLocaleLowerCase());
    return { record_name: record.name, file_name: fileName, content };
  });

  return {
    template_name: validated.templateName,
    placeholders: validated.placeholders,
    generated_count: outputs.length,
    outputs,
  };
}

module.exports = {
  LIMITS,
  ValidationError,
  extractPlaceholders,
  renderTemplateBatch,
  safeOutputBaseName,
  validateRenderRequest,
};
