import type {
  DocumentSetResponse,
  GenerationResponse,
  PreviewResponse,
} from "./types";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(
  /\/$/,
  "",
);

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let message = `Request failed with status ${response.status}.`;
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail)) {
      message = body.detail
        .map((item) => {
          if (typeof item === "object" && item !== null && "msg" in item) {
            return String(item.msg);
          }
          return String(item);
        })
        .join(" ");
    }
  } catch {
    // Keep the HTTP status fallback when the body is not JSON.
  }
  throw new Error(message);
}

export async function uploadDocumentSet(
  name: string,
  files: File[],
): Promise<DocumentSetResponse> {
  const form = new FormData();
  form.append("name", name);
  for (const file of files) {
    form.append("files", file);
  }

  const response = await fetch(`${API_URL}/document-sets`, {
    method: "POST",
    body: form,
  });
  return parseResponse<DocumentSetResponse>(response);
}

export async function previewEdit(
  documentSetId: string,
  linkGroupId: string,
  replacementText: string,
): Promise<PreviewResponse> {
  const response = await fetch(`${API_URL}/document-sets/${documentSetId}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      link_group_id: linkGroupId,
      replacement_text: replacementText,
    }),
  });
  return parseResponse<PreviewResponse>(response);
}

export async function generateEdit(
  documentSetId: string,
  linkGroupId: string,
  replacementText: string,
): Promise<GenerationResponse> {
  const response = await fetch(`${API_URL}/document-sets/${documentSetId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      link_group_id: linkGroupId,
      replacement_text: replacementText,
    }),
  });
  return parseResponse<GenerationResponse>(response);
}

export function absoluteDownloadUrl(relativeUrl: string): string {
  const apiOrigin = new URL(API_URL);
  return new URL(relativeUrl, apiOrigin.origin).toString();
}
