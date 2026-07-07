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
import { customElement, property } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import { getTypeIcon, formatDate } from '@web-vision/kanban-workspaces/core/utils.js';
/**
 * A single kanban card. Presentational: it renders the card markup and emits
 * DOM events (`card-click`, `card-menu`, `card-dragstart`, `card-dragend`) that
 * the board coordinates. The host uses `display: contents` (see SCSS) so the
 * inner `.kanban-card` stays the flex item and existing styles apply unchanged.
 */
let KanbanCardElement = class KanbanCardElement extends LitElement {
    constructor() {
        super(...arguments);
        this.selected = false;
    }
    createRenderRoot() {
        return this;
    }
    emit(type, detail = {}) {
        this.dispatchEvent(new CustomEvent(type, { detail: { card: this.card, ...detail }, bubbles: true, composed: true }));
    }
    onDragStart(e) {
        e.dataTransfer?.setData('text/plain', String(this.card.id));
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
        }
        this.emit('card-dragstart', { element: e.currentTarget });
    }
    renderIntegrity() {
        const status = this.card.integrityStatus;
        if (!status || status === 'success' || status === 'info') {
            return nothing;
        }
        const iconMap = { info: 'fa-info-circle', warning: 'fa-exclamation-triangle', error: 'fa-exclamation-circle' };
        const labelMap = { info: 'Info', warning: 'Warning', error: 'Error' };
        const messages = this.card.integrityMessages || 'Integrity check';
        return html `
      <div class="card-integrity integrity-${status}" title=${messages}>
        <i class="fas ${iconMap[status] || 'fa-info-circle'}"></i>
        <span class="integrity-label">${labelMap[status] || 'Info'}</span>
      </div>`;
    }
    renderAssignees() {
        const assignees = this.card.assignee ? [this.card.assignee] : (this.card.assignedUsers || []);
        if (assignees.length === 0) {
            return nothing;
        }
        return html `<div class="card-assignees">${assignees.map((u) => {
            const title = u.username || 'UID ' + u.uid;
            const initial = (u.username || 'U' + u.uid).charAt(0).toUpperCase();
            if (u.avatar_url) {
                return html `<span class="user-avatar" title=${title}><img
            src=${u.avatar_url} alt=${title} loading="lazy"
            @error=${(e) => {
                    const img = e.target;
                    img.style.display = 'none';
                    const next = img.nextElementSibling;
                    if (next) {
                        next.style.display = 'flex';
                    }
                }} /><span class="user-avatar-initial" style="display:none">${initial}</span></span>`;
            }
            return html `<span class="user-avatar" title=${title}>${initial}</span>`;
        })}</div>`;
    }
    render() {
        const card = this.card;
        const assignees = card.assignee ? [card.assignee] : (card.assignedUsers || []);
        return html `
      <div
        class="kanban-card ${card.priority ? `priority-${card.priority}` : ''} ${this.selected ? 'selected' : ''}"
        data-card-id=${card.id}
        data-integrity-status=${card.integrityStatus || 'success'}
        draggable="true"
        role="button"
        tabindex="0"
        aria-label="Card: ${card.title}"
        @click=${() => this.emit('card-click')}
        @dragstart=${(e) => this.onDragStart(e)}
        @dragend=${(e) => this.emit('card-dragend', { element: e.currentTarget })}>
        <div class="card-header">
          <div class="card-type">
            <i class=${getTypeIcon(card.type)}></i>
            <span>${card.type}</span>
          </div>
          <div class="card-indicators">
            ${this.renderIntegrity()}
            ${card.attachments && card.attachments.length > 0 ? html `
              <div class="card-attachments"><i class="fas fa-paperclip"></i><span>${card.attachments.length}</span></div>` : nothing}
          </div>
          <button class="card-menu" title="Card actions" aria-label="Card menu"
            @click=${(e) => { e.stopPropagation(); this.emit('card-menu', { anchor: e.currentTarget }); }}>
            <i class="fas fa-ellipsis-h"></i>
          </button>
        </div>

        <h4 class="card-title">${card.title}</h4>

        <div class="card-meta">
          <div class="card-meta-row">
            <span class="card-uid">UID: ${card.uid}</span>
            <span class="card-page">${card.pageName}</span>
          </div>
          <div class="card-meta-row">
            <span class="card-date">${formatDate(card.modifiedDate)}</span>
          </div>
        </div>

        ${card.integrityMessages && card.integrityStatus !== 'success' ? html `
          <div class="card-integrity-messages"><i class="fas fa-info-circle"></i><span>${card.integrityMessages}</span></div>` : nothing}

        <div class="card-badges">
          ${card.hasSchedule ? html `<span class="card-badge schedule"><i class="fas fa-clock"></i>${card.scheduleText}</span>` : nothing}
          ${card.dueDate ? html `<div class="card-due-date"><i class="fas fa-calendar-alt"></i><span>${formatDate(card.dueDate)}</span></div>` : nothing}
        </div>
        <div class="card-footer">
          <div class="card-language">
            ${card.language?.icon
            ? html `<typo3-backend-icon identifier=${card.language.icon} size="small"></typo3-backend-icon>`
            : html `<span class="t3js-icon icon icon-size-small icon-state-default"><span class="icon-markup">🌐</span></span>`}
            ${(card.languageCode || 'en').toUpperCase()}
          </div>
          ${this.renderAssignees()}
          <div class="card-stats">
            ${card.comments && card.comments > 0 ? html `<div class="card-comments"><i class="fas fa-comment"></i><span>${card.comments}</span></div>` : nothing}
          </div>
        </div>
      </div>`;
    }
};
__decorate([
    property({ attribute: false })
], KanbanCardElement.prototype, "card", void 0);
__decorate([
    property({ type: Boolean })
], KanbanCardElement.prototype, "selected", void 0);
KanbanCardElement = __decorate([
    customElement('typo3-kanban-card')
], KanbanCardElement);
export { KanbanCardElement };
