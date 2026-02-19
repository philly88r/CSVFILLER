
export interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  message: string;
}

export interface QualityCheck {
  id: string;
  requirement: string;
  isVerified: boolean;
}

export interface CSVData {
  headers: string[];
  rows: string[][];
}

export interface AppState {
  step: 'setup' | 'processing' | 'review';
  csvData: CSVData | null;
  instructions: string;
  checklist: QualityCheck[];
  agents: AgentStatus[];
  groundingUrls: string[];
}

/**
 * Interface representing a vendor data page structure for SEO content generation.
 */
export interface VendorPage {
  vendor_type: string;
  location: string;
  title: string;
  meta_description: string;
  h1_heading: string;
  introduction: string;
  h2_section_1_heading: string;
  h2_section_1_content: string;
  h2_section_2_heading: string;
  h2_section_2_content: string;
  h2_section_3_heading: string;
  h2_section_3_content: string;
  h2_section_4_heading: string;
  h2_section_4_content: string;
  h2_section_5_heading: string;
  h2_section_5_content: string;
  h3_subsection_1_heading: string;
  h3_subsection_1_content: string;
  h3_subsection_1_bullets: string;
  h3_subsection_2_heading: string;
  h3_subsection_2_content: string;
  h3_subsection_2_bullets: string;
  h3_subsection_3_heading: string;
  h3_subsection_3_content: string;
  h3_subsection_3_bullets: string;
  table_1_caption: string;
  table_1_html: string;
  table_2_caption: string;
  table_2_html: string;
  blockquote_1_quote: string;
  blockquote_1_attribution: string;
  blockquote_1_type: string;
  blockquote_2_quote: string;
  blockquote_2_attribution: string;
  blockquote_2_type: string;
  faq_1_question: string;
  faq_1_answer: string;
  faq_2_question: string;
  faq_2_answer: string;
  faq_3_question: string;
  faq_3_answer: string;
  internal_link_1_url: string;
  internal_link_1_text: string;
  internal_link_2_url: string;
  internal_link_2_text: string;
  internal_link_3_url: string;
  internal_link_3_text: string;
  external_link_1_url: string;
  external_link_1_text: string;
  external_link_2_url: string;
  external_link_2_text: string;
  conclusion: string;
  image_1_alt: string;
  image_2_alt: string;
  image_3_alt: string;
}
