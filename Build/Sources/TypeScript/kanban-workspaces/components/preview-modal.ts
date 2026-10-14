import { html, nothing, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { getInitials, formatDate, extractCurrentValueFromDiffHtml } from '@web-vision/kanban-workspaces/core/utils.js';
import { destroyCommentRte, mountCommentRte, type CommentRteHandle } from '@web-vision/kanban-workspaces/rte/CommentRte.js';
import {
  extractWatcherMentionsFromHtml,
  sanitizeCommentHtml,
  type MentionFeedItem,
} from '@web-vision/kanban-workspaces/mention/MentionFeed.js';
import type { Card, Stage } from '@web-vision/kanban-workspaces/types.js';
import type { ChecklistStageGroup } from '@web-vision/kanban-workspaces/data/WorkspaceApi.js';

type PreviewTab = 'comments' | 'activity' | 'history' | 'changes';

/**
 * Card preview modal (Jira-style two-column layout).
 * Data is supplied by the board; user actions are emitted as events
 * (`preview-close`, `preview-add-comment`, `preview-revert`, `preview-next`,
 * `checklist-toggle`). Checklist is shown inline on the Comment panel
 * (after Description, before the comment editor); checks appear in Activity.
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

  @state() private activeTab: PreviewTab = 'comments';
  @state() private detailsOpen = true;
  @state() private watchersOpen = true;
  @state() private descriptionOpen = true;
  private commentRte: CommentRteHandle | null = null;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  public resetTab(): void {
    this.activeTab = 'comments';
  }

  public clearCommentField(): void {
    this.teardownCommentRte();
    if (this.canCompose() && this.open) {
      void this.ensureCommentRte();
    }
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('open') && !this.open) {
      this.teardownCommentRte();
      return;
    }
    if (!this.open || this.loading) {
      return;
    }
    if (changed.has('activeTab') && !this.canCompose()) {
      this.teardownCommentRte();
      return;
    }
    if ((changed.has('open') || changed.has('activeTab') || changed.has('loading')) && this.canCompose()) {
      void this.ensureCommentRte();
    }
  }

  private canCompose(): boolean {
    return this.activeTab === 'comments';
  }

  private async ensureCommentRte(): Promise<void> {
    if (this.commentRte) {
      return;
    }
    await this.updateComplete;
    requestAnimationFrame(async () => {
      this.commentRte = await mountCommentRte('newComment');
    });
  }

  private teardownCommentRte(): void {
    destroyCommentRte('newComment');
    this.commentRte = null;
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
    const text = (this.commentRte?.getData() || this.querySelector<HTMLTextAreaElement>('#newComment')?.value || '').trim();
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

  private userComments(): any[] {
    return (this.comments || []).filter((comment) => this.isUserComment(comment));
  }

  private activityItems(): any[] {
    return (this.comments || []).filter((comment) => !this.isUserComment(comment));
  }

  private isUserComment(comment: any): boolean {
    if (typeof comment.isUserComment === 'boolean') {
      return comment.isUserComment;
    }
    // Fallback for stale payloads: stage moves and checklist audits are Activity.
    const content = String(comment.content || '');
    if (/^Moved from "/.test(content) || /^(Checked|Unchecked):/.test(content)) {
      return false;
    }
    return true;
  }

  private collectWatchers(): { users: MentionFeedItem[]; groups: MentionFeedItem[] } {
    const users = new Map<number, MentionFeedItem>();
    const groups = new Map<number, MentionFeedItem>();
    this.userComments().forEach((comment) => {
      const htmlContent = String(comment.content || '');
      if (!htmlContent.includes('data-mention')) {
        return;
      }
      const extracted = extractWatcherMentionsFromHtml(htmlContent);
      extracted.users.forEach((user) => users.set(user.uid, user));
      extracted.groups.forEach((group) => groups.set(group.uid, group));
    });
    return {
      users: Array.from(users.values()),
      groups: Array.from(groups.values()),
    };
  }

  private renderBreadcrumb(): TemplateResult {
    const card = this.card!;
    const typeLabel = card.type || card.table || 'record';
    return html`
      <div class="preview-breadcrumb">
        <span class="preview-breadcrumb-type">${typeLabel}</span>
        <span class="preview-breadcrumb-sep">/</span>
        <span class="preview-breadcrumb-key">${card.uid}</span>
      </div>`;
  }

  private renderChecklist(): TemplateResult | typeof nothing {
    const hasStages = this.checklistStages.some((group) => group.items.length > 0);
    if (!hasStages) {
      return nothing;
    }
    return html`
      <section class="preview-checklist" aria-label="Checklist">
        ${this.checklistStages.map((group) => html`
          <div class="preview-checklist-group">
            <h5 class="preview-section-title">${this.stageLabel(group.stage_id)}</h5>
            <p class="preview-checklist-hint">Checking items is optional</p>
            <div class="preview-description-body" role="list">
              ${group.items.map((item) => html`
                <div class="preview-description-field" role="listitem">
                  <label class="preview-checklist-item-label" for=${`previewChecklist-${group.stage_id}-${item.id}`}>
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
                    <span class="preview-description-field-content">${item.title}</span>
                  </label>
                </div>`)}
            </div>
          </div>`)}
      </section>`;
  }

  private renderPillTabs(): TemplateResult {
    const userCount = this.userComments().length;
    const tabs: { id: PreviewTab; label: string; count?: number }[] = [
      { id: 'comments', label: 'Comment', count: userCount },
      { id: 'activity', label: 'Activity' },
      { id: 'history', label: 'History' },
      { id: 'changes', label: 'Changes' },
    ];
    return html`
      <div class="preview-pill-tabs" role="tablist" aria-label="Preview sections">
        ${tabs.map((tab) => html`
          <button type="button" role="tab"
            class="preview-pill-tab ${this.activeTab === tab.id ? 'active' : ''}"
            aria-selected=${this.activeTab === tab.id ? 'true' : 'false'}
            @click=${() => { this.activeTab = tab.id; }}>
            ${tab.label}${tab.count ? html` (${tab.count})` : nothing}
          </button>`)}
      </div>`;
  }

  private renderChanges(): TemplateResult {
    if (!this.diffs || this.diffs.length === 0) {
      return html`<div class="empty-state">No changes detected</div>`;
    }
    return html`${this.diffs.map((diff) => this.renderDiffItem(diff))}`;
  }

  private renderDiffItem(diff: any): TemplateResult {
    return html`
      <div class="change-item">
        <div class="change-label">${diff.label}</div>
        <div class="change-content">${unsafeHTML(diff.content || '')}</div>
      </div>`;
  }

  /**
   * Content-element / record field content shown like Jira Description.
   * Uses the workspace (current) value only — not live/workspace diff markup.
   */
  private renderDescription(): TemplateResult | typeof nothing {
    const fields = (this.diffs || [])
      .map((diff) => ({
        label: String(diff.label || '').trim(),
        content: extractCurrentValueFromDiffHtml(String(diff.content || '')).trim(),
      }))
      .filter((field) => {
        if (!field.content) {
          return false;
        }
        // Drop empty processed-value shells (nbsp / empty tags only).
        const text = field.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
        return text !== '';
      });

    if (fields.length === 0) {
      return nothing;
    }
    return html`
      <section class="preview-description" aria-label="Description">
        <button type="button" class="preview-description-toggle"
          @click=${() => { this.descriptionOpen = !this.descriptionOpen; }}>
          <span class="preview-section-title">Description</span>
          <i class="fas fa-chevron-${this.descriptionOpen ? 'down' : 'right'}"></i>
        </button>
        ${this.descriptionOpen ? html`
          <div class="preview-description-body">
            ${fields.map((field) => html`
              <div class="preview-description-field">
                ${field.label ? html`<div class="preview-description-field-label">${field.label}</div>` : nothing}
                <div class="preview-description-field-content">${unsafeHTML(field.content)}</div>
              </div>`)}
          </div>` : nothing}
      </section>`;
  }

  private renderComment(comment: any): TemplateResult {
    const safe = sanitizeCommentHtml(String(comment.content || ''));
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
          <div class="comment-content">${unsafeHTML(safe)}</div>
          ${(comment.replies || []).map((reply: any) => this.renderComment(reply))}
        </div>
      </div>`;
  }

  private renderUserCommentList(): TemplateResult {
    const items = this.userComments();
    if (items.length === 0) {
      return html`<div class="empty-state">No comments yet</div>`;
    }
    return html`${items.map((comment) => this.renderComment(comment))}`;
  }

  private renderActivity(): TemplateResult {
    const items = this.activityItems();
    if (items.length === 0) {
      return html`<div class="empty-state">No activity yet</div>`;
    }
    return html`${items.map((comment) => this.renderComment(comment))}`;
  }

  private renderHistory(): TemplateResult {
    if (!this.history || this.history.length === 0) {
      return html`<div class="empty-state">No history available</div>`;
    }
    return html`${this.history.map((item) => this.renderHistoryItem(item))}`;
  }

  private renderHistoryItem(item: any): TemplateResult {
    return html`
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
      </div>`;
  }

  private renderCommentForm(): TemplateResult {
    return html`
      <div class="comment-form preview-comment-form preview-comment-form--top">
        <div class="kanban-rte-host" data-rte-for="newComment"></div>
        <button class="btn btn-primary" ?disabled=${this.commentPending} @click=${() => this.submitComment()}>
          <i class="fas ${this.commentPending ? 'fa-spinner fa-spin' : 'fa-comment'}"></i> Add Comment
        </button>
      </div>`;
  }

  private renderDetailRow(label: string, value: TemplateResult | string | typeof nothing): TemplateResult | typeof nothing {
    if (value === nothing || value === '' || value == null) {
      return nothing;
    }
    return html`
      <div class="preview-detail-row">
        <div class="preview-detail-label">${label}</div>
        <div class="preview-detail-value">${value}</div>
      </div>`;
  }

  private renderDetails(): TemplateResult {
    const card = this.card!;
    const assignee = card.assignee;
    const assigneeLabel = assignee
      ? html`
          <span class="preview-assignee">
            ${assignee.avatar_url
              ? html`<img class="preview-assignee-avatar" src=${assignee.avatar_url} alt="">`
              : html`<span class="preview-assignee-avatar preview-assignee-initials">${getInitials(assignee.username || 'U')}</span>`}
            <span>${assignee.username || 'User ' + assignee.uid}</span>
          </span>`
      : 'None';

    const languageTitle = card.language?.title || card.languageCode || '';
    const integrity = card.integrityStatus && card.integrityStatus !== 'ok'
      ? html`<span class="preview-integrity preview-integrity--${card.integrityStatus}">${card.integrityStatus}${card.integrityMessages ? html`: ${card.integrityMessages}` : nothing}</span>`
      : nothing;

    return html`
      <div class="preview-accordion ${this.detailsOpen ? 'is-open' : ''}">
        <button type="button" class="preview-accordion-toggle" @click=${() => { this.detailsOpen = !this.detailsOpen; }}>
          <span>Details</span>
          <i class="fas fa-chevron-${this.detailsOpen ? 'down' : 'right'}"></i>
        </button>
        ${this.detailsOpen ? html`
          <div class="preview-accordion-body">
            ${this.renderDetailRow('Priority', card.priority || nothing)}
            ${this.renderDetailRow('Assignee', assigneeLabel)}
            ${languageTitle ? this.renderDetailRow('Language', languageTitle) : nothing}
            ${card.pageName ? this.renderDetailRow('Page', card.pageName) : nothing}
            ${card.type ? this.renderDetailRow('Type', card.type) : nothing}
            ${integrity !== nothing ? this.renderDetailRow('Integrity', integrity) : nothing}
            ${card.modifiedDate ? this.renderDetailRow('Updated', formatDate(card.modifiedDate)) : nothing}
            ${card.editor ? this.renderDetailRow('Editor', card.editor) : nothing}
          </div>` : nothing}
      </div>`;
  }

  private renderWatchers(): TemplateResult {
    const { users, groups } = this.collectWatchers();
    const empty = users.length === 0 && groups.length === 0;
    return html`
      <div class="preview-accordion ${this.watchersOpen ? 'is-open' : ''}">
        <button type="button" class="preview-accordion-toggle" @click=${() => { this.watchersOpen = !this.watchersOpen; }}>
          <span>Watchers</span>
          <i class="fas fa-chevron-${this.watchersOpen ? 'down' : 'right'}"></i>
        </button>
        ${this.watchersOpen ? html`
          <div class="preview-accordion-body">
            ${empty ? html`<div class="preview-watchers-empty">None</div>` : html`
              <ul class="preview-watchers-list">
                ${users.map((user) => html`
                  <li class="preview-watcher-item">
                    ${user.avatarUrl
                      ? html`<img class="preview-watcher-avatar" src=${user.avatarUrl} alt="">`
                      : html`<span class="preview-watcher-avatar preview-watcher-initials">${getInitials(user.username || user.text || 'U')}</span>`}
                    <span class="preview-watcher-name">${user.text || user.username || `@user:${user.uid}`}</span>
                  </li>`)}
                ${groups.map((group) => html`
                  <li class="preview-watcher-item preview-watcher-group">
                    <span class="preview-watcher-avatar preview-watcher-group-icon"><i class="fas fa-users"></i></span>
                    <span class="preview-watcher-name">
                      ${group.text || `@group:${group.uid}`}
                      ${group.memberCount != null ? html`<span class="preview-watcher-meta">${group.memberCount} members</span>` : nothing}
                    </span>
                  </li>`)}
              </ul>`}
          </div>` : nothing}
      </div>`;
  }

  private renderSidebar(): TemplateResult {
    return html`
      <aside class="preview-sidebar" aria-label="Issue details">
        <div class="preview-status">
          <button type="button" class="preview-status-btn" disabled title="Stage transitions use Approve / board actions">
            <span class="preview-status-label">${this.stageLabel()}</span>
          </button>
        </div>
        ${this.renderDetails()}
        ${this.renderWatchers()}
      </aside>`;
  }

  protected override render(): TemplateResult {
    if (!this.card) {
      return html`<div class="modal-overlay" id="previewModal" style="display: none;"></div>`;
    }
    return html`
      <div class="modal-overlay" id="previewModal" style=${`display: ${this.open ? 'flex' : 'none'}`}
        @click=${(e: Event) => this.onOverlayClick(e)}>
        <div class="modal modal-dialog modal-xl preview-issue-dialog" role="dialog" aria-modal="true">
          <div class="modal-content preview-issue-content">
            <button class="modal-close btn-close preview-issue-close" aria-label="Close" @click=${() => this.emit('preview-close')}>
              <i class="fas fa-times"></i>
            </button>

            <div class="preview-issue-layout">
              <div class="preview-main">
                <header class="preview-main-header">
                  ${this.renderBreadcrumb()}
                  <h4 class="modal-title preview-issue-title" id="modalTitle">${this.card.title}</h4>
                </header>

                ${this.renderPillTabs()}

                <div class="preview-main-body modal-body">
                  ${this.loading ? html`<div class="empty-state">Loading…</div>` : html`
                    <div class="tab-content preview-tab-content">
                      <div class="tab-pane ${this.activeTab === 'comments' ? 'active' : ''}" role="tabpanel">
                        ${this.renderDescription()}
                        ${this.renderChecklist()}
                        ${this.renderCommentForm()}
                        <div class="comments-container">${this.renderUserCommentList()}</div>
                      </div>
                      <div class="tab-pane ${this.activeTab === 'activity' ? 'active' : ''}" role="tabpanel">
                        <div class="comments-container preview-activity-feed">${this.renderActivity()}</div>
                      </div>
                      <div class="tab-pane ${this.activeTab === 'history' ? 'active' : ''}" role="tabpanel">
                        <div class="history-container">${this.renderHistory()}</div>
                      </div>
                      <div class="tab-pane ${this.activeTab === 'changes' ? 'active' : ''}" role="tabpanel">
                        <div class="changes-container">${this.renderChanges()}</div>
                      </div>
                    </div>`}
                </div>
              </div>

              ${this.renderSidebar()}
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
