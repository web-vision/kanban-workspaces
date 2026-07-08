// Shared view-model types for the Kanban board components. Kept intentionally
// permissive: the payloads originate from the TYPO3 workspace API and are
// normalised by the DataTransformer, so most consumers treat them loosely.

export interface CardUser {
  uid: number | string;
  username?: string;
  avatar_url?: string | null;
}

export interface CardLanguage {
  icon?: string;
  title?: string;
  title_crop?: string;
}

export interface Card {
  id: string | number;
  title: string;
  type: string;
  uid: number | string;
  pageName?: string;
  editor?: string;
  editorId?: string;
  modifiedDate?: string;
  stage: string | number;
  language?: CardLanguage;
  languageCode?: string;
  priority?: string;
  originalPriority?: string;
  integrityStatus?: string;
  integrityMessages?: string;
  hasSchedule?: boolean;
  scheduleText?: string | null;
  comments?: number;
  assignedUsers?: CardUser[];
  assignee?: CardUser | null;
  t3ver_oid?: number | null;
  t3ver_wsid?: number | null;
  table?: string;
  pid?: number | null;
  nextStage?: unknown;
  prevStage?: unknown;
  dueDate?: string;
  attachments?: unknown[];
  [key: string]: unknown;
}

export interface Stage {
  id: string | number;
  label: string;
  color?: string;
  order?: number;
  [key: string]: unknown;
}

export interface FilterOption {
  id: string | number;
  label: string;
  /** Pre-rendered TYPO3 core icon HTML for the language filter prefix. */
  flagHtml?: string;
  icon?: string;
}

export interface FilterConfig {
  label: string;
  options: FilterOption[];
}

export interface BoardOptions {
  apiUrl: string;
  getDataApiUrl?: string;
  getProcessApiUrl?: string;
  enableDragDrop: boolean;
  enableFilters: boolean;
  enableSearch: boolean;
  enableComments: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  animations: boolean;
  mockData: boolean;
}
