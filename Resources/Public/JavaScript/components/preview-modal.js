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
import { getInitials, formatDate } from '@web-vision/kanban-workspaces/core/utils.js';
/**
 * Card preview modal: summary-of-changes, activity (comments) and history tabs.
 * Data is supplied by the board; user actions are emitted as events
 * (`preview-close`, `preview-add-comment`, `preview-revert`, `preview-next`).
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
        this.loading = false;
        this.commentPending = false;
        this.activeTab = 'changes';
    }
    createRenderRoot() {
        return this;
    }
    resetTab() {
        this.activeTab = 'changes';
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
        const textarea = this.querySelector('#newComment');
        const text = (textarea?.value || '').trim();
        if (!text) {
            this.emit('toast', { message: 'Please enter a comment', type: 'warning' });
            return;
        }
        this.emit('preview-add-comment', { text });
    }
    stageLabel() {
        const stage = this.stages.find((s) => s.id == this.card?.stage);
        return stage ? stage.label : String(this.card?.stage ?? '');
    }
    renderMeta() {
        const card = this.card;
        return html `
      <span>UID: ${card.uid}</span>
      <span>Page: ${card.pageName}</span>
      ${card.editor ? html `<span>Editor: ${card.editor}</span>` : nothing}
      <span class="card-badge">${this.stageLabel()}</span>`;
    }
    renderChanges() {
        if (!this.diffs || this.diffs.length === 0) {
            return html `<div class="empty-state">No changes detected</div>`;
        }
        return html `${this.diffs.map((diff) => html `
      <div class="change-item">
        <div class="change-label">${diff.label}</div>
        <div class="change-content">${unsafeHTML(diff.content)}</div>
      </div>`)}`;
    }
    renderComment(comment) {
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
          <div class="comment-content">${comment.content}</div>
          ${(comment.replies || []).map((reply) => this.renderComment(reply))}
        </div>
      </div>`;
    }
    renderComments() {
        if (!this.comments || this.comments.length === 0) {
            return html `<div class="empty-state">No comments yet</div>`;
        }
        return html `${this.comments.map((comment) => this.renderComment(comment))}`;
    }
    renderHistory() {
        if (!this.history || this.history.length === 0) {
            return html `<div class="empty-state">No history available</div>`;
        }
        return html `${this.history.map((item) => html `
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
      </div>`)}`;
    }
    render() {
        if (!this.card) {
            return html `<div class="modal-overlay" id="previewModal" style="display: none;"></div>`;
        }
        return html `
      <div class="modal-overlay" id="previewModal" style=${`display: ${this.open ? 'flex' : 'none'}`}
        @click=${(e) => this.onOverlayClick(e)}>
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
              ${['changes', 'comments', 'history'].map((tab) => html `
                <li class="nav-item" role="presentation">
                  <button class="nav-link ${this.activeTab === tab ? 'active' : ''}" role="tab"
                    @click=${() => { this.activeTab = tab; }}>
                    ${tab === 'changes' ? 'Summary of changes' : tab === 'comments' ? html `Activity (${this.comments.length})` : 'History'}
                  </button>
                </li>`)}
            </ul>

            <div class="modal-body">
              ${this.loading ? html `<div class="empty-state">Loading…</div>` : html `
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
    property({ type: Boolean })
], KanbanPreviewModalElement.prototype, "loading", void 0);
__decorate([
    property({ type: Boolean })
], KanbanPreviewModalElement.prototype, "commentPending", void 0);
__decorate([
    state()
], KanbanPreviewModalElement.prototype, "activeTab", void 0);
KanbanPreviewModalElement = __decorate([
    customElement('typo3-kanban-preview-modal')
], KanbanPreviewModalElement);
export { KanbanPreviewModalElement };
