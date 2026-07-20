import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  absoluteDownloadUrl,
  generateEdit,
  previewEdit,
  uploadDocumentSet,
} from "./api";
import type {
  DocumentSetResponse,
  GenerationResponse,
  LinkGroup,
  PreviewResponse,
} from "./types";

function readableBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function App() {
  const [setName, setSetName] = useState("Building agreements");
  const [files, setFiles] = useState<File[]>([]);
  const [documentSet, setDocumentSet] = useState<DocumentSetResponse | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [replacement, setReplacement] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [generation, setGeneration] = useState<GenerationResponse | null>(null);
  const [busyAction, setBusyAction] = useState<"upload" | "preview" | "generate" | null>(
    null,
  );
  const [error, setError] = useState("");

  const selectedGroup = useMemo<LinkGroup | null>(() => {
    return documentSet?.link_groups.find((group) => group.id === selectedGroupId) ?? null;
  }, [documentSet, selectedGroupId]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles(nextFiles);
    setDocumentSet(null);
    setSelectedGroupId("");
    setPreview(null);
    setGeneration(null);
    setError("");
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusyAction("upload");
    setPreview(null);
    setGeneration(null);
    try {
      const uploaded = await uploadDocumentSet(setName, files);
      setDocumentSet(uploaded);
      const firstGroup = uploaded.link_groups[0];
      if (firstGroup) {
        setSelectedGroupId(firstGroup.id);
        setReplacement(firstGroup.representative_text);
      } else {
        setSelectedGroupId("");
        setReplacement("");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The upload failed.");
    } finally {
      setBusyAction(null);
    }
  }

  function selectGroup(group: LinkGroup) {
    setSelectedGroupId(group.id);
    setReplacement(group.representative_text);
    setPreview(null);
    setGeneration(null);
    setError("");
  }

  async function handlePreview() {
    if (!documentSet || !selectedGroup) return;
    setError("");
    setBusyAction("preview");
    setGeneration(null);
    try {
      setPreview(await previewEdit(documentSet.id, selectedGroup.id, replacement));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The preview failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerate() {
    if (!documentSet || !selectedGroup) return;
    setError("");
    setBusyAction("generate");
    try {
      setGeneration(await generateEdit(documentSet.id, selectedGroup.id, replacement));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  const canUpload = setName.trim().length > 0 && files.length >= 2 && !busyAction;
  const canPreview = Boolean(
    documentSet && selectedGroup && replacement.trim().length > 0 && !busyAction,
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DocumentSync home">
          <span className="brand-mark" aria-hidden="true">
            DS
          </span>
          <span>
            <strong>DocumentSync</strong>
            <small>Controlled document updates</small>
          </span>
        </a>
        <span className="prototype-pill">Milestone 1 prototype</span>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Edit once. Confirm every location.</p>
            <h1>Synchronise repeated content across existing Word documents.</h1>
            <p className="hero-text">
              Upload related DOCX files, review exact repeated paragraphs, preview the impact,
              and generate new versions while the originals remain unchanged.
            </p>
            <div className="trust-row" aria-label="Prototype safeguards">
              <span>✓ User-confirmed matches</span>
              <span>✓ Immutable originals</span>
              <span>✓ Preview before generation</span>
            </div>
          </div>
          <div className="workflow-card" aria-label="DocumentSync workflow">
            <div><span>1</span><p><strong>Upload</strong><small>Choose related DOCX files</small></p></div>
            <div><span>2</span><p><strong>Confirm</strong><small>Select shared paragraphs</small></p></div>
            <div><span>3</span><p><strong>Generate</strong><small>Download new versions</small></p></div>
          </div>
        </section>

        <section className="workspace" aria-labelledby="workspace-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Working prototype</p>
              <h2 id="workspace-title">Create a document set</h2>
            </div>
            <p>For this prototype, upload between 2 and 20 DOCX files.</p>
          </div>

          {error && (
            <div className="alert error-alert" role="alert">
              <strong>Something went wrong.</strong>
              <span>{error}</span>
            </div>
          )}

          <form className="upload-panel" onSubmit={handleUpload}>
            <label className="field">
              <span>Document-set name</span>
              <input
                value={setName}
                onChange={(event) => setSetName(event.target.value)}
                maxLength={200}
                placeholder="Example: Building agreements"
              />
            </label>

            <label className="file-drop">
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                onChange={handleFiles}
              />
              <span className="file-icon" aria-hidden="true">DOCX</span>
              <strong>Select related Word documents</strong>
              <small>Exact repeated paragraphs will be suggested after upload.</small>
            </label>

            {files.length > 0 && (
              <div className="selected-files" aria-live="polite">
                <div className="selected-files-header">
                  <strong>{files.length} file{files.length === 1 ? "" : "s"} selected</strong>
                  <button type="button" className="text-button" onClick={() => setFiles([])}>
                    Clear
                  </button>
                </div>
                <ul>
                  {files.map((file) => (
                    <li key={`${file.name}-${file.lastModified}`}>
                      <span>{file.name}</span>
                      <small>{readableBytes(file.size)}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button className="primary-button" type="submit" disabled={!canUpload}>
              {busyAction === "upload" ? "Analysing documents…" : "Upload and find matches"}
            </button>
          </form>
        </section>

        {documentSet && (
          <section className="results" aria-labelledby="results-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Document set ready</p>
                <h2 id="results-title">{documentSet.name}</h2>
              </div>
              <p>
                {documentSet.documents.length} documents · {documentSet.link_groups.length} exact
                match group{documentSet.link_groups.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="document-strip" aria-label="Uploaded documents">
              {documentSet.documents.map((document) => (
                <article key={document.id}>
                  <span className="doc-badge" aria-hidden="true">W</span>
                  <div>
                    <strong>{document.name}</strong>
                    <small>{document.element_count} text paragraphs</small>
                  </div>
                </article>
              ))}
            </div>

            {documentSet.link_groups.length === 0 ? (
              <div className="empty-state">
                <h3>No repeated paragraphs were found.</h3>
                <p>
                  The current prototype matches paragraphs after normalising whitespace and letter
                  case. Try another document set or add manual linking in the next iteration.
                </p>
              </div>
            ) : (
              <div className="editor-grid">
                <section className="panel match-panel" aria-labelledby="matches-title">
                  <div className="panel-heading">
                    <span className="step-number">1</span>
                    <div>
                      <h3 id="matches-title">Confirm shared content</h3>
                      <p>Select the exact-match group you intend to change.</p>
                    </div>
                  </div>

                  <div className="match-list">
                    {documentSet.link_groups.map((group) => (
                      <button
                        type="button"
                        key={group.id}
                        className={`match-card ${group.id === selectedGroupId ? "selected" : ""}`}
                        onClick={() => selectGroup(group)}
                        aria-pressed={group.id === selectedGroupId}
                      >
                        <span className="match-meta">
                          <strong>Exact match</strong>
                          <small>{group.document_count} documents · {group.member_count} locations</small>
                        </span>
                        <q>{group.representative_text}</q>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="panel edit-panel" aria-labelledby="edit-title">
                  <div className="panel-heading">
                    <span className="step-number">2</span>
                    <div>
                      <h3 id="edit-title">Edit once</h3>
                      <p>The replacement is only applied to the selected confirmed locations.</p>
                    </div>
                  </div>

                  <label className="field">
                    <span>Replacement paragraph</span>
                    <textarea
                      value={replacement}
                      onChange={(event) => {
                        setReplacement(event.target.value);
                        setPreview(null);
                        setGeneration(null);
                      }}
                      rows={7}
                    />
                  </label>

                  {selectedGroup && (
                    <div className="impact-summary">
                      <strong>Expected impact</strong>
                      <span>{selectedGroup.document_count} documents</span>
                      <span>{selectedGroup.member_count} paragraph locations</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="primary-button"
                    disabled={!canPreview}
                    onClick={handlePreview}
                  >
                    {busyAction === "preview" ? "Creating preview…" : "Preview all changes"}
                  </button>
                </section>
              </div>
            )}
          </section>
        )}

        {preview && (
          <section className="preview-section" aria-labelledby="preview-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Review required</p>
                <h2 id="preview-title">Preview every affected location</h2>
              </div>
              <p>{preview.affected_document_count} documents · {preview.affected_location_count} changes</p>
            </div>

            <div className="preview-list">
              {preview.documents.map((document) => (
                <article className="preview-document" key={document.document_id}>
                  <header>
                    <span className="doc-badge" aria-hidden="true">W</span>
                    <div>
                      <h3>{document.document_name}</h3>
                      <p>{document.changes.length} confirmed location{document.changes.length === 1 ? "" : "s"}</p>
                    </div>
                  </header>
                  {document.changes.map((change) => (
                    <div className="diff" key={change.paragraph_index}>
                      <p className="location-label">Paragraph {change.paragraph_index + 1}</p>
                      <div className="diff-row before">
                        <span>Before</span>
                        <p>{change.before}</p>
                      </div>
                      <div className="diff-row after">
                        <span>After</span>
                        <p>{change.after}</p>
                      </div>
                    </div>
                  ))}
                </article>
              ))}
            </div>

            <div className="confirmation-bar">
              <div>
                <strong>Original files will remain unchanged.</strong>
                <span>Generation creates new DOCX copies and one ZIP download.</span>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={handleGenerate}
                disabled={Boolean(busyAction)}
              >
                {busyAction === "generate" ? "Generating versions…" : "Confirm and generate"}
              </button>
            </div>
          </section>
        )}

        {generation && (
          <section className="success-section" aria-live="polite">
            <div className="success-mark" aria-hidden="true">✓</div>
            <div>
              <p className="eyebrow">Generation complete</p>
              <h2>Your updated documents are ready.</h2>
              <p>
                {generation.files.length} new DOCX file{generation.files.length === 1 ? "" : "s"} were
                created. The originals were not overwritten.
              </p>
              <ul>
                {generation.files.map((file) => (
                  <li key={`${file.source_document_id}-${file.name}`}>{file.name}</li>
                ))}
              </ul>
            </div>
            <a className="download-button" href={absoluteDownloadUrl(generation.download_url)}>
              Download ZIP
            </a>
          </section>
        )}
      </main>

      <footer>
        <strong>DocumentSync</strong>
      </footer>
    </div>
  );
}

export default App;
