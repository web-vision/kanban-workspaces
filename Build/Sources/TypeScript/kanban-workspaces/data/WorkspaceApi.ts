import { DataTransformer } from '@web-vision/kanban-workspaces/data/DataTransformer.js';
import type { Card } from '@web-vision/kanban-workspaces/types.js';

export interface CardDetails {
  comments: any[];
  history: any[];
  diff: any[];
}

export interface ChecklistStageGroup {
  stage_id: number;
  items: Array<{ id: number; title: string; checked: boolean }>;
}

export interface ChecklistResponse {
  success: boolean;
  items?: Array<{ id: number; title: string; checked: boolean }>;
  stages?: ChecklistStageGroup[];
  error?: string;
}

/**
 * Transport layer over the TYPO3 workspace AJAX dispatch endpoint. Stateless
 * apart from its configured endpoints and the pure {@link DataTransformer};
 * it issues requests and returns normalised view models, it does not touch the
 * DOM or hold board state.
 */
export class WorkspaceApi {
  private readonly transformer = new DataTransformer();

  constructor(
    private readonly dataUrl: string,
    private readonly processUrl: string,
  ) {}

  private postJson(url: string, payload: unknown): Promise<any> {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response.json();
    });
  }

  private checklistUrl(routeKey: string): string | null {
    return (window as any).TYPO3?.settings?.ajaxUrls?.[routeKey] || null;
  }

  private async postChecklist(
    routeKey: string,
    payload: Record<string, unknown>,
    missingMessage: string,
    softFail = false,
  ): Promise<ChecklistResponse> {
    const url = this.checklistUrl(routeKey);
    if (!url) {
      if (softFail) {
        return { success: false, error: missingMessage, items: [], stages: [] };
      }
      throw new Error(missingMessage);
    }
    return this.postJson(url, payload);
  }

  // Fetch the workspace records for the given dispatch payload and map to cards.
  async fetchData(apiPayload: unknown): Promise<{ cards: Card[]; total: number }> {
    const apiResponse = await this.postJson(this.dataUrl, apiPayload);
    const cards = this.transformer.convertWorkspaceDataToCards(apiResponse);
    return { cards, total: apiResponse[0]?.result?.total || cards.length };
  }

  // Fetch comments / history / diff details for a single card.
  async fetchCardDetails(card: Card): Promise<CardDetails> {
    const apiPayload = {
      action: 'RemoteServer',
      method: 'getRowDetails',
      data: [{ stage: card.stage, t3ver_oid: card.t3ver_oid, table: card.table, uid: card.uid, filterFields: true }],
    };
    const apiResponse = await this.postJson(this.dataUrl, apiPayload);
    return this.transformer.convertCardDetailsToFormat(apiResponse, card.id);
  }

  // Generic "Actions" dispatch call (view/delete/send-to-stage/add-comment).
  dispatch(payload: unknown): Promise<any> {
    return this.postJson(this.dataUrl, payload);
  }

  async fetchChecklist(payload: Record<string, unknown>): Promise<ChecklistResponse> {
    return this.postChecklist(
      'kanban_workspace_checklist_get',
      payload,
      'Checklist endpoint unavailable',
      true,
    );
  }

  async saveChecklist(payload: Record<string, unknown>): Promise<ChecklistResponse> {
    return this.postChecklist('kanban_workspace_checklist_save', payload, 'Checklist save endpoint unavailable');
  }

  async toggleChecklistItem(payload: Record<string, unknown>): Promise<ChecklistResponse> {
    return this.postChecklist('kanban_workspace_checklist_toggle', payload, 'Checklist toggle endpoint unavailable');
  }

  // Persist a module-data value (filter selection) via the user settings endpoint.
  processData(action: string, filterType: string, filterValue: string): Promise<void> {
    const formData = new FormData();
    formData.append('action', action);
    formData.append('key', `moduleData.web_kanbanworkspaces.${filterType}`);
    formData.append('value', filterValue);
    return fetch(this.processUrl, { method: 'POST', body: formData })
      .then((response) => response.json())
      .then(() => undefined);
  }
}
