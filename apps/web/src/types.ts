export interface DocumentSummary {
  id: string;
  name: string;
  checksum_sha256: string;
  element_count: number;
}

export interface LinkMember {
  element_id: string;
  document_id: string;
  document_name: string;
  paragraph_index: number;
  text: string;
  style_name: string | null;
}

export interface LinkGroup {
  id: string;
  match_type: "exact" | string;
  representative_text: string;
  member_count: number;
  document_count: number;
  members: LinkMember[];
}

export interface DocumentSetResponse {
  id: string;
  name: string;
  created_at: string;
  documents: DocumentSummary[];
  link_groups: LinkGroup[];
}

export interface PreviewChange {
  paragraph_index: number;
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
}
