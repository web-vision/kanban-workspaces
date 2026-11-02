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
import { formatDate } from '@web-vision/kanban-workspaces/core/utils.js';
// PublishedHistoryService::MAX_AGE_DAYS, the AJAX controller clamps to it as well.
const maxDays = 365;
const fallbackLabels = {
    'publishedHistory.title': 'Live',
    'publishedHistory.description': 'Published from this workspace in the last %s days',
    'publishedHistory.days': 'Number of days',
    'publishedHistory.empty': 'Nothing has been published from this workspace in the last %s days.',
    'publishedHistory.publishedBy': 'Published %s by %s',
    'publishedHistory.showChanges': 'Show changes',
    'publishedHistory.action.new': 'New',
    'publishedHistory.action.modified': 'Changed',
    'publishedHistory.action.deleted': 'Deleted',
};
// Translated label from TYPO3.lang (locallang.xlf, "publishedHistory." prefix), %s replaced in order.
function label(key, ...args) {
    const text = TYPO3?.lang?.[key] || fallbackLabels[key] || key;
    return args.reduce((result, arg) => result.replace('%s', String(arg)), text);
}
/**
 * Read-only "Live" column listing the records published from the current
 * workspace (sys_history publish entries). It is no drop target and its cards
 * are not draggable: published records can only be looked at. A card links to
 * the record history, which shows the published changes.
 *
 * The number of days in the column description is an input; changing it
 * dispatches a `published-days-change` event the board reloads the list on.
 */
let KanbanPublishedColumnElement = class KanbanPublishedColumnElement extends LitElement {
    constructor() {
        super(...arguments);
        this.records = [];
        this.days = 0;
    }
    createRenderRoot() {
        return this;
    }
    handleDaysChange(event) {
        const input = event.target;
        const days = Math.round(input.valueAsNumber);
        if (!input.checkValidity() || !Number.isFinite(days) || days === this.days) {
            input.value = String(this.days);
            return;
        }
        this.dispatchEvent(new CustomEvent('published-days-change', { detail: { days }, bubbles: true }));
    }
    // The description label with its %s replaced by the days input.
    renderDescription() {
        const [before, after = ''] = label('publishedHistory.description').split('%s');
        return html `${before}<input type="number" class="form-control form-control-sm published-days-input"
      min="1" max=${maxDays} step="1" required .value=${String(this.days)}
      aria-label=${label('publishedHistory.days')} title=${label('publishedHistory.days')}
      @change=${(e) => this.handleDaysChange(e)}>${after}`;
    }
    historyUrl(record) {
        return `${record.historyUrl}&returnUrl=${encodeURIComponent(window.location.href)}`;
    }
    renderRecord(record) {
        return html `
      <a class="kanban-card kanban-card-published" href=${this.historyUrl(record)}
        data-history-id=${record.id} title=${label('publishedHistory.showChanges')}>
        <div class="card-header">
          <div class="card-type">
            <i class="fas fa-history"></i>
            <span>${record.type}</span>
          </div>
          <span class="published-action published-action-${record.action}">${label(`publishedHistory.action.${record.action}`)}</span>
        </div>

        <h4 class="card-title">${record.title}</h4>

        <div class="card-meta">
          <div class="card-meta-row">
            <span class="card-uid">UID: ${record.uid}</span>
            <span class="card-page">${record.pageTitle}</span>
          </div>
          <div class="card-meta-row">
            <span class="card-date">${label('publishedHistory.publishedBy', formatDate(record.publishedAt), record.publishedBy)}</span>
          </div>
        </div>

        ${record.comment ? html `
          <div class="published-comment"><i class="fas fa-comment"></i><span>${record.comment}</span></div>` : nothing}
      </a>`;
    }
    render() {
        return html `
      <div class="kanban-column kanban-column-published" data-stage-id="published">
        <div class="column-header">
          <div class="column-title-row">
            <div class="column-title-main">
              <div class="stage-indicator"></div>
              <span class="column-name">${label('publishedHistory.title')}</span>
              <span class="column-count">${this.records.length}</span>
            </div>
          </div>
          <div class="column-description">${this.renderDescription()}</div>
        </div>
        <div class="column-content">
          ${this.records.length === 0
            ? html `<div class="column-empty">${label('publishedHistory.empty', this.days)}</div>`
            : this.records.map((record) => this.renderRecord(record))}
        </div>
      </div>`;
    }
};
__decorate([
    property({ attribute: false })
], KanbanPublishedColumnElement.prototype, "records", void 0);
__decorate([
    property({ type: Number })
], KanbanPublishedColumnElement.prototype, "days", void 0);
KanbanPublishedColumnElement = __decorate([
    customElement('typo3-kanban-published-column')
], KanbanPublishedColumnElement);
export { KanbanPublishedColumnElement };
