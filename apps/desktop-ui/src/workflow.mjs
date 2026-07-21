const PLACEHOLDER_PATTERN = /{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g;

export class WorkflowError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "WorkflowError";
    this.details = details;
  }
}

export function extractPlaceholderNames(template) {
  const names = [];
  const seen = new Set();
  for (const match of String(template).matchAll(PLACEHOLDER_PATTERN)) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      names.push(match[1]);
    }
  }
  return names;
}

export function reconcileRecords(records, placeholders) {
  return records.map((record) => ({
    ...record,
    values: Object.fromEntries(
      placeholders.map((field) => [field, record.values[field] ?? ""]),
    ),
  }));
}

export function createInitialState() {
  const template = [
    "Dear {{centre_name}},",
    "",
    "Your reporting date is {{reporting_date}}.",
    "The responsible manager is {{manager_name}}.",
    "",
    "Regards,",
    "DocSync",
  ].join("\n");
  return {
    templateName: "Monthly reporting notice",
    template,
    records: [
      {
        id: crypto.randomUUID(),
        name: "Building A",
        values: {
          centre_name: "Building A",
          reporting_date: "31 July 2026",
          manager_name: "Amina Jacobs",
        },
      },
      {
        id: crypto.randomUUID(),
        name: "Building B",
        values: {
          centre_name: "Building B",
          reporting_date: "31 July 2026",
          manager_name: "Ben Naidoo",
        },
      },
    ],
  };
}

export function buildRenderRequest(state) {
  const templateName = state.templateName.trim();
  const template = state.template;
  const placeholders = extractPlaceholderNames(template);
  const details = [];
  if (!templateName) details.push("Enter a template name.");
  if (!template.trim()) details.push("Enter template text.");
  if (placeholders.length === 0) details.push("Add at least one placeholder such as {{centre_name}}.");
  if (!Array.isArray(state.records) || state.records.length < 2) details.push("Add at least two records.");

  const records = (state.records ?? []).map((record, index) => {
    const name = record.name.trim();
    if (!name) details.push(`Record ${index + 1} needs a name.`);
    for (const field of placeholders) {
      if (!String(record.values[field] ?? "").trim()) {
        details.push(`${name || `Record ${index + 1}`}: enter ${field.replaceAll("_", " ")}.`);
      }
    }
    return {
      name,
      values: Object.fromEntries(
        placeholders.map((field) => [field, String(record.values[field] ?? "")]),
      ),
    };
  });

  const lowerNames = records.map((record) => record.name.toLocaleLowerCase()).filter(Boolean);
  if (new Set(lowerNames).size !== lowerNames.length) details.push("Record names must be unique.");
  if (details.length > 0) {
    throw new WorkflowError("Check the highlighted workflow before generating.", details);
  }

  return {
    template_name: templateName,
    template,
    records,
  };
}

export function normaliseApiError(payload, status) {
  const error = payload && typeof payload === "object" ? payload.error : null;
  if (error && typeof error.message === "string") {
    return new WorkflowError(
      error.message,
      Array.isArray(error.details)
        ? error.details.map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && item.record && item.field) {
            return `${item.record}: enter ${String(item.field).replaceAll("_", " ")}.`;
          }
          return JSON.stringify(item);
        })
        : [],
    );
  }
  return new WorkflowError(`The request failed with status ${status}.`);
}
