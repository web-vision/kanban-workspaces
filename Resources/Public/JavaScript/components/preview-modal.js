/*
 * This file is part of the web-vision/kanban_workspaces TYPO3 extension.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2 of the
 * License, or any later version.
 *
 * Generated from Build/Sources/TypeScript/ - do not edit directly, change the
 * TypeScript source and re-run "npm run build:js" instead.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, nothing, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { getInitials, formatDate, extractCurrentValueFromDiffHtml } from '@web-vision/kanban-workspaces/core/utils.js';
import { destroyCommentRte, mountCommentRte } from '@web-vision/kanban-workspaces/rte/CommentRte.js';
import { extractWatcherMentionsFromHtml, sanitizeCommentHtml, } from '@web-vision/kanban-workspaces/mention/MentionFeed.js';
/**
 * Card preview modal (Jira-style two-column layout).
 * Data is supplied by the board; user actions are emitted as events
 * (`preview-close`, `preview-add-comment`, `preview-revert`, `preview-next`,
 * `checklist-toggle`). Checklist is shown inline on the Comment panel
 * (after Description, before the comment editor); checks appear in Activity.
 */
let KanbanPreviewModalElement = class KanbanPreviewModalElement extends LitElement {
    constructor() {
        super(...arguments);
        this.open = false;
        this.card = null;
        this.stages = [];
        this.comments = [];
        this.history = [];
        this.diffs = [];
        this.checklistStages = [];
        this.loading = false;
        this.commentPending = false;
        this.checklistPending = false;
        this.activeTab = 'comments';
        this.detailsOpen = true;
        this.watchersOpen = true;
        this.descriptionOpen = true;
        this.commentRte = null;
    }
    createRenderRoot() {
        return this;
    }
    resetTab() {
        this.activeTab = 'comments';
    }
    clearCommentField() {
        this.teardownCommentRte();
        if (this.canCompose() && this.open) {
            void this.ensureCommentRte();
        }
    }
    updated(changed) {
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
    canCompose() {
        return this.activeTab === 'comments';
    }
    async ensureCommentRte() {
        if (this.commentRte) {
            return;
        }
        await this.updateComplete;
        requestAnimationFrame(async () => {
            this.commentRte = await mountCommentRte('newComment');
        });
    }
    teardownCommentRte() {
        destroyCommentRte('newComment');
        this.commentRte = null;
    }
    emit(type, detail = {}) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    onOverlayClick(e) {
        if (e.target.id === 'previewModal') {
            this.emit('preview-close');
        }
    }
    submitComment() {
        const text = (this.commentRte?.getData() || this.querySelector('#newComment')?.value || '').trim();
        if (!text) {
            this.emit('toast', { message: 'Please enter a comment', type: 'warning' });
            return;
        }
        this.emit('preview-add-comment', { text });
    }
    stageLabel(stageId) {
        const id = stageId ?? this.card?.stage;
        const stage = this.stages.find((s) => s.id == id);
        return stage ? stage.label : String(id ?? '');
    }
    userComments() {
        return (this.comments || []).filter((comment) => this.isUserComment(comment));
    }
    activityItems() {
        return (this.comments || []).filter((comment) => !this.isUserComment(comment));
    }
    isUserComment(comment) {
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
    collectWatchers() {
        const users = new Map();
        const groups = new Map();
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
    renderBreadcrumb() {
        const card = this.card;
        const typeLabel = card.type || card.table || 'record';
        return html `
      <div class="preview-breadcrumb">
        <span class="preview-breadcrumb-type">${typeLabel}</span>
        <span class="preview-breadcrumb-sep">/</span>
        <span class="preview-breadcrumb-key">${card.uid}</span>
      </div>`;
    }
    renderChecklist() {
        const hasStages = this.checklistStages.some((group) => group.items.length > 0);
        if (!hasStages) {
            return nothing;
        }
        return html `
      <section class="preview-checklist" aria-label="Checklist">
        ${this.checklistStages.map((group) => html `
          <div class="preview-checklist-group">
            <h5 class="preview-section-title">${this.stageLabel(group.stage_id)}</h5>
            <p class="preview-checklist-hint">Checking items is optional</p>
            <div class="preview-description-body" role="list">
              ${group.items.map((item) => html `
                <div class="preview-description-field" role="listitem">
                  <label class="preview-checklist-item-label" for=${`previewChecklist-${group.stage_id}-${item.id}`}>
                    <input type="checkbox"
                      class="stage-checklist-checkbox"
                      id=${`previewChecklist-${group.stage_id}-${item.id}`}
                      .checked=${!!item.checked}
                      ?disabled=${this.checklistPending}
                      @change=${(e) => this.emit('checklist-toggle', {
            stageId: group.stage_id,
            itemUid: item.id,
            checked: e.target.checked,
        })}>
                    <span class="preview-description-field-content">${item.title}</span>
                  </label>
                </div>`)}
            </div>
          </div>`)}
      </section>`;
    }
    renderPillTabs() {
        const userCount = this.userComments().length;
        const tabs = [
            { id: 'comments', label: 'Comment', count: userCount },
            { id: 'activity', label: 'Activity' },
            { id: 'history', label: 'History' },
            { id: 'changes', label: 'Changes' },
        ];
        return html `
      <div class="preview-pill-tabs" role="tablist" aria-label="Preview sections">
        ${tabs.map((tab) => html `
          <button type="button" role="tab"
            class="preview-pill-tab ${this.activeTab === tab.id ? 'active' : ''}"
            aria-selected=${this.activeTab === tab.id ? 'true' : 'false'}
            @click=${() => { this.activeTab = tab.id; }}>
            ${tab.label}${tab.count ? html ` (${tab.count})` : nothing}
          </button>`)}
      </div>`;
    }
    renderChanges() {
        if (!this.diffs || this.diffs.length === 0) {
            return html `<div class="empty-state">No changes detected</div>`;
        }
        return html `${this.diffs.map((diff) => this.renderDiffItem(diff))}`;
    }
    renderDiffItem(diff) {
        return html `
      <div class="change-item">
        <div class="change-label">${diff.label}</div>
        <div class="change-content">${unsafeHTML(diff.content || '')}</div>
      </div>`;
    }
    /**
     * Content-element / record field content shown like Jira Description.
     * Uses the workspace (current) value only — not live/workspace diff markup.
     */
    renderDescription() {
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
        return html `
      <section class="preview-description" aria-label="Description">
        <button type="button" class="preview-description-toggle"
          @click=${() => { this.descriptionOpen = !this.descriptionOpen; }}>
          <span class="preview-section-title">Description</span>
          <i class="fas fa-chevron-${this.descriptionOpen ? 'down' : 'right'}"></i>
        </button>
        ${this.descriptionOpen ? html `
          <div class="preview-description-body">
            ${fields.map((field) => html `
              <div class="preview-description-field">
                ${field.label ? html `<div class="preview-description-field-label">${field.label}</div>` : nothing}
                <div class="preview-description-field-content">${unsafeHTML(field.content)}</div>
              </div>`)}
          </div>` : nothing}
      </section>`;
    }
    renderComment(comment) {
        const safe = sanitizeCommentHtml(String(comment.content || ''));
        return html `
      <div class="comment">
        <div class="comment-avatar">
          ${comment.avatar ? html `<img src=${comment.avatar} alt=${comment.author}>` : html `<span>${getInitials(comment.author || 'Unknown')}</span>`}
        </div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${comment.author}</span>
            <span class="comment-date">${formatDate(comment.timestamp)}</span>
          </div>
          <div class="comment-content">${unsafeHTML(safe)}</div>
          ${(comment.replies || []).map((reply) => this.renderComment(reply))}
        </div>
      </div>`;
    }
    renderUserCommentList() {
        const items = this.userComments();
        if (items.length === 0) {
            return html `<div class="empty-state">No comments yet</div>`;
        }
        return html `${items.map((comment) => this.renderComment(comment))}`;
    }
    renderActivity() {
        const items = this.activityItems();
        if (items.length === 0) {
            return html `<div class="empty-state">No activity yet</div>`;
        }
        return html `${items.map((comment) => this.renderComment(comment))}`;
    }
    renderHistory() {
        if (!this.history || this.history.length === 0) {
            return html `<div class="empty-state">No history available</div>`;
        }
        return html `${this.history.map((item) => this.renderHistoryItem(item))}`;
    }
    renderHistoryItem(item) {
        return html `
      <div class="history-item">
        <div class="comment-avatar">
          ${item.avatar ? html `<img src=${item.avatar} alt=${item.author}>` : html `<span>${getInitials(item.author || 'Unknown')}</span>`}
        </div>
        <div class="history-body">
          <div class="comment-header">
            <span class="comment-author">${item.author}</span>
            <span class="comment-date">${item.datetime || formatDate(item.timestamp)}</span>
          </div>
          ${Array.isArray(item.differences) && item.differences.length > 0
            ? item.differences.map((diff) => html `
                <div class="history-diff-item"><strong>${diff.label}</strong> ${unsafeHTML(diff.html || '')}</div>`)
            : html `<div class="history-action">${item.action || 'Updated record'}</div>`}
        </div>
      </div>`;
    }
    renderCommentForm() {
        return html `
      <div class="comment-form preview-comment-form preview-comment-form--top">
        <div class="kanban-rte-host" data-rte-for="newComment"></div>
        <button class="btn btn-primary" ?disabled=${this.commentPending} @click=${() => this.submitComment()}>
          <i class="fas ${this.commentPending ? 'fa-spinner fa-spin' : 'fa-comment'}"></i> Add Comment
        </button>
      </div>`;
    }
    renderDetailRow(label, value) {
        if (value === nothing || value === '' || value == null) {
            return nothing;
        }
        return html `
      <div class="preview-detail-row">
        <div class="preview-detail-label">${label}</div>
        <div class="preview-detail-value">${value}</div>
      </div>`;
    }
    renderDetails() {
        const card = this.card;
        const assignee = card.assignee;
        const assigneeLabel = assignee
            ? html `
          <span class="preview-assignee">
            ${assignee.avatar_url
                ? html `<img class="preview-assignee-avatar" src=${assignee.avatar_url} alt="">`
                : html `<span class="preview-assignee-avatar preview-assignee-initials">${getInitials(assignee.username || 'U')}</span>`}
            <span>${assignee.username || 'User ' + assignee.uid}</span>
          </span>`
            : 'None';
        const languageTitle = card.language?.title || card.languageCode || '';
        const integrity = card.integrityStatus && card.integrityStatus !== 'ok'
            ? html `<span class="preview-integrity preview-integrity--${card.integrityStatus}">${card.integrityStatus}${card.integrityMessages ? html `: ${card.integrityMessages}` : nothing}</span>`
            : nothing;
        return html `
      <div class="preview-accordion ${this.detailsOpen ? 'is-open' : ''}">
        <button type="button" class="preview-accordion-toggle" @click=${() => { this.detailsOpen = !this.detailsOpen; }}>
          <span>Details</span>
          <i class="fas fa-chevron-${this.detailsOpen ? 'down' : 'right'}"></i>
        </button>
        ${this.detailsOpen ? html `
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
    renderWatchers() {
        const { users, groups } = this.collectWatchers();
        const empty = users.length === 0 && groups.length === 0;
        return html `
      <div class="preview-accordion ${this.watchersOpen ? 'is-open' : ''}">
        <button type="button" class="preview-accordion-toggle" @click=${() => { this.watchersOpen = !this.watchersOpen; }}>
          <span>Watchers</span>
          <i class="fas fa-chevron-${this.watchersOpen ? 'down' : 'right'}"></i>
        </button>
        ${this.watchersOpen ? html `
          <div class="preview-accordion-body">
            ${empty ? html `<div class="preview-watchers-empty">None</div>` : html `
              <ul class="preview-watchers-list">
                ${users.map((user) => html `
                  <li class="preview-watcher-item">
                    ${user.avatarUrl
            ? html `<img class="preview-watcher-avatar" src=${user.avatarUrl} alt="">`
            : html `<span class="preview-watcher-avatar preview-watcher-initials">${getInitials(user.username || user.text || 'U')}</span>`}
                    <span class="preview-watcher-name">${user.text || user.username || `@user:${user.uid}`}</span>
                  </li>`)}
                ${groups.map((group) => html `
                  <li class="preview-watcher-item preview-watcher-group">
                    <span class="preview-watcher-avatar preview-watcher-group-icon"><i class="fas fa-users"></i></span>
                    <span class="preview-watcher-name">
                      ${group.text || `@group:${group.uid}`}
                      ${group.memberCount != null ? html `<span class="preview-watcher-meta">${group.memberCount} members</span>` : nothing}
                    </span>
                  </li>`)}
              </ul>`}
          </div>` : nothing}
      </div>`;
    }
    renderSidebar() {
        return html `
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
    render() {
        if (!this.card) {
            return html `<div class="modal-overlay" id="previewModal" style="display: none;"></div>`;
        }
        return html `
      <div class="modal-overlay" id="previewModal" style=${`display: ${this.open ? 'flex' : 'none'}`}
        @click=${(e) => this.onOverlayClick(e)}>
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
                  ${this.loading ? html `<div class="empty-state">Loading…</div>` : html `
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
};
__decorate([
    property({ type: Boolean })
], KanbanPreviewModalElement.prototype, "open", void 0);
__decorate([
    property({ attribute: false })
], KanbanPreviewModalElement.prototype, "card", void 0);
__decorate([
    property({ attribute: false })
], KanbanPreviewModalElement.prototype, "stages", void 0);
__decorate([
    property({ attribute: false })
], KanbanPreviewModalElement.prototype, "comments", void 0);
__decorate([
    property({ attribute: false })
], KanbanPreviewModalElement.prototype, "history", void 0);
__decorate([
    property({ attribute: false })
], KanbanPreviewModalElement.prototype, "diffs", void 0);
__decorate([
    property({ attribute: false })
], KanbanPreviewModalElement.prototype, "checklistStages", void 0);
__decorate([
    property({ type: Boolean })
], KanbanPreviewModalElement.prototype, "loading", void 0);
__decorate([
    property({ type: Boolean })
], KanbanPreviewModalElement.prototype, "commentPending", void 0);
__decorate([
    property({ type: Boolean })
], KanbanPreviewModalElement.prototype, "checklistPending", void 0);
__decorate([
    state()
], KanbanPreviewModalElement.prototype, "activeTab", void 0);
__decorate([
    state()
], KanbanPreviewModalElement.prototype, "detailsOpen", void 0);
__decorate([
    state()
], KanbanPreviewModalElement.prototype, "watchersOpen", void 0);
__decorate([
    state()
], KanbanPreviewModalElement.prototype, "descriptionOpen", void 0);
KanbanPreviewModalElement = __decorate([
    customElement('typo3-kanban-preview-modal')
], KanbanPreviewModalElement);
export { KanbanPreviewModalElement };
