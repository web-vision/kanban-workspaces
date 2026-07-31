import { html, nothing, LitElement, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { getInitials, formatDate } from '@web-vision/kanban-workspaces/core/utils.js';
import type { Card, Stage } from '@web-vision/kanban-workspaces/types.js';
import type { ChecklistStageGroup } from '@web-vision/kanban-workspaces/data/WorkspaceApi.js';

type PreviewTab = 'changes' | 'comments' | 'history' | 'checklist';

/**
 * Card preview modal: summary-of-changes, activity (comments), history and
 * checklist tabs. Checklist check/uncheck is written as ACTION_STAGECHANGE and
 * appears in the Activity tab (same as EXT:workspaces stage moves).
 */
@customElement('typo3-kanban-preview-modal')
export class KanbanPreviewModalElement extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) card: Card | null = null;
  @property({ attribute: false }) stages: Stage[] = [];
  @property({ attribute: false }) comments: any[] = [];
  @property({ attribute: false }) history: any[] = [];
  @property({ attribute: false }) diffs: any[] = [];
  @property({ attribute: false }) checklistStages: ChecklistStageGroup[] = [];
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) commentPending = false;
  @property({ type: Boolean }) checklistPending = false;

  @state() private activeTab: PreviewTab = 'changes';

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  public resetTab(): void {
    this.activeTab = 'changes';
  }

  private emit(type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private onOverlayClick(e: Event): void {
    if ((e.target as HTMLElement).id === 'previewModal') {
      this.emit('preview-close');
    }
  }

  private submitComment(): void {
    const textarea = this.querySelector<HTMLTextAreaElement>('#newComment');
    const text = (textarea?.value || '').trim();
    if (!text) {
      this.emit('toast', { message: 'Please enter a comment', type: 'warning' });
      return;
    }
    this.emit('preview-add-comment', { text });
  }

  private stageLabel(stageId?: string | number): string {
    const id = stageId ?? this.card?.stage;
    const stage = this.stages.find((s) => s.id == id);
    return stage ? stage.label : String(id ?? '');
  }

  private renderMeta(): TemplateResult {
    const card = this.card!;
    return html`
      <span>UID: ${card.uid}</span>
      <span>Page: ${card.pageName}</span>
      ${card.editor ? html`<span>Editor: ${card.editor}</span>` : nothing}
      <span class="card-badge">${this.stageLabel()}</span>`;
  }

  private renderChanges(): TemplateResult {
    if (!this.diffs || this.diffs.length === 0) {
      return html`<div class="empty-state">No changes detected</div>`;
    }
    return html`${this.diffs.map((diff) => html`
      <div class="change-item">
        <div class="change-label">${diff.label}</div>
        <div class="change-content">${unsafeHTML(diff.content)}</div>
      </div>`)}`;
  }

  private renderComment(comment: any): TemplateResult {
    return html`
      <div class="comment">
        <div class="comment-avatar">
          ${comment.avatar ? html`<img src=${comment.avatar} alt=${comment.author}>` : html`<span>${getInitials(comment.author || 'Unknown')}</span>`}
        </div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${comment.author}</span>
            <span class="comment-date">${formatDate(comment.timestamp)}</span>
          </div>
          <div class="comment-content">${comment.content}</div>
          ${(comment.replies || []).map((reply: any) => this.renderComment(reply))}
        </div>
      </div>`;
  }

  private renderComments(): TemplateResult {
    if (!this.comments || this.comments.length === 0) {
      return html`<div class="empty-state">No comments yet</div>`;
    }
    return html`${this.comments.map((comment) => this.renderComment(comment))}`;
  }

  private renderHistory(): TemplateResult {
    if (!this.history || this.history.length === 0) {
      return html`<div class="empty-state">No history available</div>`;
    }
    return html`${this.history.map((item) => html`
      <div class="history-item">
        <div class="comment-avatar">
          ${item.avatar ? html`<img src=${item.avatar} alt=${item.author}>` : html`<span>${getInitials(item.author || 'Unknown')}</span>`}
        </div>
        <div class="history-body">
          <div class="comment-header">
            <span class="comment-author">${item.author}</span>
            <span class="comment-date">${item.datetime || formatDate(item.timestamp)}</span>
          </div>
          ${Array.isArray(item.differences) && item.differences.length > 0
            ? item.differences.map((diff: any) => html`
                <div class="history-diff-item"><strong>${diff.label}</strong> ${unsafeHTML(diff.html || '')}</div>`)
            : html`<div class="history-action">${item.action || 'Updated record'}</div>`}
        </div>
      </div>`)}`;
  }

  private renderChecklist(): TemplateResult {
    const hasStages = this.checklistStages.some((group) => group.items.length > 0);
    if (!hasStages) {
      return html`<div class="empty-state">No checklist items for this card yet</div>`;
    }
    return html`
      <div class="checklist-panel">
        ${this.checklistStages.map((group) => html`
          <div class="checklist-stage-group stage-checklist-list">
            <h5 class="checklist-stage-title">${this.stageLabel(group.stage_id)}</h5>
            <p class="form-text">Checking items is optional</p>
            <ul class="stage-checklist-ul" role="list">
              ${group.items.map((item) => html`
                <li class="stage-checklist-item">
                  <label class="stage-checklist-item-label" for=${`previewChecklist-${group.stage_id}-${item.id}`}>
                    <input type="checkbox"
                      class="stage-checklist-checkbox"
                      id=${`previewChecklist-${group.stage_id}-${item.id}`}
                      .checked=${!!item.checked}
                      ?disabled=${this.checklistPending}
                      @change=${(e: Event) => this.emit('checklist-toggle', {
                        stageId: group.stage_id,
                        itemUid: item.id,
                        checked: (e.target as HTMLInputElement).checked,
                      })}>
                    <span class="stage-checklist-item-title">${item.title}</span>
                  </label>
                </li>`)}
            </ul>
          </div>`)}
      </div>`;
  }

  private tabLabel(tab: PreviewTab): TemplateResult | string {
    switch (tab) {
      case 'changes':
        return 'Summary of changes';
      case 'comments':
        return html`Activity (${this.comments.length})`;
      case 'checklist':
        return 'Checklist';
      case 'history':
        return 'History';
    }
  }

  protected override render(): TemplateResult {
    if (!this.card) {
      return html`<div class="modal-overlay" id="previewModal" style="display: none;"></div>`;
    }
    const tabs: PreviewTab[] = ['changes', 'comments', 'history', 'checklist'];
    return html`
      <div class="modal-overlay" id="previewModal" style=${`display: ${this.open ? 'flex' : 'none'}`}
        @click=${(e: Event) => this.onOverlayClick(e)}>
        <div class="modal modal-dialog modal-xl" role="dialog" aria-modal="true">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title-section">
                <h4 class="modal-title" id="modalTitle">${this.card.title}</h4>
                <div class="modal-meta" id="modalMeta">${this.renderMeta()}</div>
              </div>
              <button class="modal-close btn-close" aria-label="Close" @click=${() => this.emit('preview-close')}>
                <i class="fas fa-times"></i>
              </button>
            </div>

            <ul class="nav nav-tabs" role="tablist">
              ${tabs.map((tab) => html`
                <li class="nav-item" role="presentation">
                  <button class="nav-link ${this.activeTab === tab ? 'active' : ''}" role="tab"
                    @click=${() => { this.activeTab = tab; }}>
                    ${this.tabLabel(tab)}
                  </button>
                </li>`)}
            </ul>

            <div class="modal-body">
              ${this.loading ? html`<div class="empty-state">Loading…</div>` : html`
                <div class="tab-content">
                  <div class="tab-pane ${this.activeTab === 'changes' ? 'active' : ''}">
                    <div class="changes-container">${this.renderChanges()}</div>
                  </div>
                  <div class="tab-pane ${this.activeTab === 'comments' ? 'active' : ''}">
                    <div class="comments-container">${this.renderComments()}</div>
                    <div class="comment-form">
                      <textarea id="newComment" class="form-control" placeholder="Add a comment..." rows="3"></textarea>
                      <button class="btn btn-primary" ?disabled=${this.commentPending} @click=${() => this.submitComment()}>
                        <i class="fas ${this.commentPending ? 'fa-spinner fa-spin' : 'fa-comment'}"></i> Add Comment
                      </button>
                    </div>
                  </div>
                  <div class="tab-pane ${this.activeTab === 'history' ? 'active' : ''}">
                    <div class="history-container">${this.renderHistory()}</div>
                  </div>
                  <div class="tab-pane ${this.activeTab === 'checklist' ? 'active' : ''}">
                    <div class="checklist-container">${this.renderChecklist()}</div>
                  </div>
                </div>`}
            </div>

            <div class="modal-footer">
              <div class="modal-actions-left">
                <button class="btn btn-outline" @click=${() => this.emit('preview-revert')}><i class="fas fa-undo"></i> Revert</button>
              </div>
              <div class="modal-actions-right">
                <button class="btn btn-outline" @click=${() => this.emit('preview-close')}>Close</button>
                <button class="btn btn-primary" @click=${() => this.emit('preview-next')}><i class="fas fa-thumbs-up"></i> Approve</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-preview-modal': KanbanPreviewModalElement;
  }
}
