export interface DocumentSummary {
  id: string;
  version_id: string;
  name: string;
  checksum_sha256: string;
  element_count: number;
  view_url: string;
}

export interface LinkMember {
  element_id: string;
  document_id: string;
  document_name: string;
  paragraph_index: number;
  element_type: "paragraph" | "heading" | "list_item" | "table_cell";
  text: string;
  style_name: string | null;
  table_index?: number;
  row_index?: number;
  column_index?: number;
}

export interface ViewerElement {
  id: string;
  document_id: string;
  paragraph_index: number;
  element_type: "paragraph" | "heading" | "list_item" | "table_cell";
  text: string;
  style_name: string | null;
  table_index?: number;
  row_index?: number;
  column_index?: number;
  page_number: number;
}

export interface ViewerPage {
  page_number: number;
  elements: ViewerElement[];
}

export interface DocumentView {
  document_id: string;
  version_id: string;
  document_set_id: string;
  document_name: string;
  render_status: "ready" | "rendering" | "failed" | string;
  render_mode: "word_pdf" | "structured" | string;
  pagination: "word" | "estimated" | string;
  page_count: number;
  notice: string;
  pdf_url?: string;
  pages: ViewerPage[];
}

export interface MatchDiscovery {
  source: {
    element_id: string;
    document_id: string;
    document_name: string;
    paragraph_index: number;
    element_type: string;
    text: string;
    style_name: string | null;
    table_index?: number;
    row_index?: number;
    column_index?: number;
  };
  link_group: LinkGroup | null;
  exact_match_count: number;
  similar_matches: LinkMember[];
  similarity_status: "not_enabled" | string;
}

export interface LinkGroup {
  id: string;
  match_type: "exact" | string;
  representative_text: string;
  member_count: number;
  document_count: number;
  members: LinkMember[];
}

export interface DocumentSetLibraryItem {
  id: string;
  name: string;
  created_at: string;
  document_count: number;
  edit_count: number;
}

export interface DocumentSetLibraryResponse {
  document_sets: DocumentSetLibraryItem[];
}

export interface DocumentSetResponse {
  id: string;
  name: string;
  created_at: string;
  documents: DocumentSummary[];
  link_group_count: number;
  link_groups: LinkGroup[];
}

export interface GlobalSearchResult {
  element_id: string;
  document_id: string;
  document_name: string;
  paragraph_index: number;
  element_type: "paragraph" | "heading" | "list_item" | "table_cell";
  table_index?: number;
  row_index?: number;
  column_index?: number;
  text: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  result_count: number;
  truncated: boolean;
}

export interface PreviewChange {
  element_id: string;
  paragraph_index: number;
  element_type: string;
  table_index?: number;
  row_index?: number;
  column_index?: number;
  before: string;
  after: string;
}

export interface PreviewDocument {
  document_id: string;
  document_name: string;
  changes: PreviewChange[];
}

export interface PreviewResponse {
  link_group_id: string;
  source_element_id: string | null;
  replacement_text: string;
  affected_document_count: number;
  affected_location_count: number;
  documents: PreviewDocument[];
}

export interface GenerationResponse {
  generation_id: string;
  status: string;
  files: Array<{
    source_document_id: string;
    name: string;
  }>;
  download_url: string;
  document_set: DocumentSetResponse;
}
