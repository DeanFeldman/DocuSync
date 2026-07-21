import {
  WorkflowError,
  buildRenderRequest,
  createInitialState,
  extractPlaceholderNames,
  normaliseApiError,
  reconcileRecords,
} from "./workflow.mjs";

const state = createInitialState();
let sessionToken = "";
let latestOutputs = [];
let selectedOutputIndex = 0;

const elements = {
  health: document.querySelector("#health-status"),
  templateName: document.querySelector("#template-name"),
  templateText: document.querySelector("#template-text"),
  fieldList: document.querySelector("#field-list"),
  recordList: document.querySelector("#record-list"),
  recordCount: document.querySelector("#record-count"),
  addRecord: document.querySelector("#add-record"),
  generate: document.querySelector("#generate"),
  form: document.querySelector("#generation-form"),
  error: document.querySelector("#workflow-error"),
  status: document.querySelector("#workflow-status"),
  results: document.querySelector("#results"),
  resultSummary: document.querySelector("#result-summary"),
  outputTabs: document.querySelector("#output-tabs"),
  outputTitle: document.querySelector("#output-title"),
  outputContent: document.querySelector("#output-content"),
  saveAll: document.querySelector("#save-all"),
};

function clearChildren(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

function fieldLabel(field) {
  return field.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function announce(message) {
  elements.status.textContent = message;
}

function showError(error) {
  const workflowError = error instanceof WorkflowError
    ? error
    : new WorkflowError(error instanceof Error ? error.message : "Something went wrong.");
  clearChildren(elements.error);
  const heading = document.createElement("strong");
  heading.textContent = workflowError.message;
  elements.error.appendChild(heading);
  if (workflowError.details.length > 0) {
    const list = document.createElement("ul");
    for (const detail of workflowError.details) {
      const item = document.createElement("li");
      item.textContent = detail;
      list.appendChild(item);
    }
    elements.error.appendChild(list);
  }
  elements.error.hidden = false;
  elements.error.focus();
}

function clearError() {
  elements.error.hidden = true;
  clearChildren(elements.error);
}

function markOutputsStale() {
  if (latestOutputs.length === 0) return;
  latestOutputs = [];
  elements.results.hidden = true;
  announce("Inputs changed. Generate again to refresh the preview.");
}

function renderPlaceholderList() {
  const placeholders = extractPlaceholderNames(state.template);
  clearChildren(elements.fieldList);
  if (placeholders.length === 0) {
    const empty = document.createElement("span");
    empty.className = "field-empty";
    empty.textContent = "No valid placeholders detected";
    elements.fieldList.appendChild(empty);
  } else {
    for (const field of placeholders) {
      const chip = document.createElement("span");
      chip.className = "field-chip";
      chip.textContent = `{{${field}}}`;
      elements.fieldList.appendChild(chip);
    }
  }
  state.records = reconcileRecords(state.records, placeholders);
  return placeholders;
}

function makeInput(labelText, value, onInput, id) {
  const wrapper = document.createElement("label");
  wrapper.className = "record-field";
  wrapper.htmlFor = id;
  const label = document.createElement("span");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.value = value;
  input.addEventListener("input", (event) => onInput(event.target.value));
  wrapper.append(label, input);
  return wrapper;
}

function renderRecords() {
  const placeholders = extractPlaceholderNames(state.template);
  clearChildren(elements.recordList);
  elements.recordCount.textContent = `${state.records.length} records`;

  state.records.forEach((record, index) => {
    const card = document.createElement("fieldset");
    card.className = "record-card";
    const legend = document.createElement("legend");
    legend.textContent = `Record ${index + 1}`;
    const header = document.createElement("div");
    header.className = "record-card-header";
    const marker = document.createElement("span");
    marker.className = "record-marker";
    marker.textContent = String(index + 1);
    const hint = document.createElement("p");
    hint.textContent = "Values replace the named placeholders in this output.";
    header.append(marker, hint);
    if (state.records.length > 2) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.setAttribute("aria-label", `Remove record ${index + 1}`);
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        state.records = state.records.filter((item) => item.id !== record.id);
        markOutputsStale();
        renderRecords();
      });
      header.appendChild(remove);
    }
    card.append(legend, header);
    card.appendChild(makeInput("Output name", record.name, (value) => {
      record.name = value;
      markOutputsStale();
    }, `record-${record.id}-name`));

    const grid = document.createElement("div");
    grid.className = "record-values";
    for (const field of placeholders) {
      grid.appendChild(makeInput(fieldLabel(field), record.values[field] ?? "", (value) => {
        record.values[field] = value;
        markOutputsStale();
      }, `record-${record.id}-${field}`));
    }
    card.appendChild(grid);
    elements.recordList.appendChild(card);
  });
}

function renderOutputPreview() {
  clearChildren(elements.outputTabs);
  latestOutputs.forEach((output, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = index === selectedOutputIndex ? "active" : "";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(index === selectedOutputIndex));
    button.textContent = output.record_name;
    button.addEventListener("click", () => {
      selectedOutputIndex = index;
      renderOutputPreview();
    });
    elements.outputTabs.appendChild(button);
  });
  const selected = latestOutputs[selectedOutputIndex];
  if (selected) {
    elements.outputTitle.textContent = selected.file_name;
    elements.outputContent.textContent = selected.content;
  }
}

async function generateOutputs() {
  clearError();
  const request = buildRenderRequest(state);
  elements.generate.disabled = true;
  elements.generate.textContent = "Generating…";
  announce("Generating customised outputs.");
  try {
    const response = await fetch("/api/v1/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { "X-DocSync-Session": sessionToken } : {}),
      },
      body: JSON.stringify(request),
    });
    const payload = await response.json();
    if (!response.ok) throw normaliseApiError(payload, response.status);
    latestOutputs = payload.outputs;
    selectedOutputIndex = 0;
    elements.resultSummary.textContent = `${payload.generated_count} customised outputs from ${payload.placeholders.length} fields`;
    elements.results.hidden = false;
    renderOutputPreview();
    announce(`${payload.generated_count} outputs generated and ready to preview.`);
    elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
  } finally {
    elements.generate.disabled = false;
    elements.generate.textContent = "Generate previews";
  }
}

async function saveOutputs() {
  if (latestOutputs.length === 0) return;
  clearError();
  if (!window.docSync?.saveOutputs) {
    showError(new WorkflowError("Native saving is available in the installed Windows application."));
    return;
  }
  elements.saveAll.disabled = true;
  try {
    const result = await window.docSync.saveOutputs(latestOutputs);
    if (!result || result.cancelled) {
      announce("Save cancelled. Your previews are still available.");
      return;
    }
    announce(`${result.saved_count} files saved to ${result.directory}.`);
  } catch (error) {
    showError(error);
  } finally {
    elements.saveAll.disabled = false;
  }
}

async function initialise() {
  elements.templateName.value = state.templateName;
  elements.templateText.value = state.template;
  renderPlaceholderList();
  renderRecords();

  try {
    sessionToken = await window.docSync?.getSessionToken?.() ?? "";
    const health = await fetch("/api/v1/health");
    if (!health.ok) throw new Error("Health check failed.");
    elements.health.classList.add("ready");
    elements.health.querySelector("span:last-child").textContent = "Service ready";
  } catch {
    elements.health.classList.add("failed");
    elements.health.querySelector("span:last-child").textContent = "Service unavailable";
    showError(new WorkflowError("The local DocSync service did not start. Close and reopen the application."));
  }
}

elements.templateName.addEventListener("input", (event) => {
  state.templateName = event.target.value;
  markOutputsStale();
});
elements.templateText.addEventListener("input", (event) => {
  state.template = event.target.value;
  renderPlaceholderList();
  renderRecords();
  markOutputsStale();
});
elements.addRecord.addEventListener("click", () => {
  const placeholders = extractPlaceholderNames(state.template);
  state.records.push({
    id: crypto.randomUUID(),
    name: `Building ${String.fromCharCode(65 + state.records.length)}`,
    values: Object.fromEntries(placeholders.map((field) => [field, ""])),
  });
  markOutputsStale();
  renderRecords();
  document.querySelector(`#record-${state.records.at(-1).id}-name`)?.focus();
});
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateOutputs().catch(showError);
});
elements.saveAll.addEventListener("click", () => saveOutputs().catch(showError));

initialise();
