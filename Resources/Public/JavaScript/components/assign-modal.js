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
import { html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
/**
 * Assign-record modal: assigns a backend user (with title/description) to a
 * workspace record. Emits `assign-submit` with the form values or
 * `assign-cancel`; the board performs the AJAX persistence.
 */
let KanbanAssignModalElement = class KanbanAssignModalElement extends LitElement {
    constructor() {
        super(...arguments);
        this.open = false;
        this.card = null;
        this.beUsers = [];
    }
    createRenderRoot() {
        return this;
    }
    emit(type, detail = {}) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    label(key, fallback) {
        return (typeof TYPO3 !== 'undefined' && TYPO3.lang && TYPO3.lang[key]) || fallback;
    }
    onOverlayClick(e) {
        if (e.target.id === 'assignModal') {
            this.emit('assign-cancel');
        }
    }
    submit() {
        const root = this;
        const beUser = parseInt(root.querySelector('[name="be_user"]')?.value || '0', 10);
        if (!beUser || beUser < 1) {
            this.emit('toast', { message: 'Please select an assignee', type: 'warning' });
            return;
        }
        this.emit('assign-submit', {
            title: (root.querySelector('[name="title"]')?.value || '').trim(),
            description: (root.querySelector('[name="description"]')?.value || '').trim(),
            be_user: beUser,
        });
    }
    render() {
        const selectedUid = this.card?.assignee?.uid;
        return html `
      <div class="modal-overlay" id="assignModal" style=${`display: ${this.open ? 'flex' : 'none'}`}
        @click=${(e) => this.onOverlayClick(e)}>
        <div class="modal modal-dialog modal-xl" role="dialog" aria-modal="true">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title-section">
                <h4 class="modal-title">${this.label('window.assign.title', 'Assign Record')}</h4>
              </div>
              <button class="modal-close btn-close" aria-label="Close" @click=${() => this.emit('assign-cancel')}>
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="modal-body">
              <form class="t3js-assign-form">
                <div class="form-group">
                  <label class="form-label">${this.label('labels.title', 'Title')}</label>
                  <input type="text" name="title" class="form-control">
                </div>
                <div class="form-group">
                  <label class="form-label">${this.label('labels.description', 'Description')}</label>
                  <textarea name="description" class="form-control" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">${this.label('labels.assignee', 'Assignee (Backend user UID)')}</label>
                  <select name="be_user" class="form-select" required>
                    <option value="0"></option>
                    ${this.beUsers.map((user) => html `
                      <option value=${user.uid} ?selected=${selectedUid != null && String(user.uid) === String(selectedUid)}>
                        ${user.username} (${user.uid})
                      </option>`)}
                  </select>
                </div>
              </form>
            </div>

            <div class="modal-footer">
              <div class="modal-actions-left"></div>
              <div class="modal-actions-right">
                <button class="btn btn-outline" @click=${() => this.emit('assign-cancel')}>Cancel</button>
                <button class="btn btn-primary" @click=${() => this.submit()}>OK</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }
};
__decorate([
    property({ type: Boolean })
], KanbanAssignModalElement.prototype, "open", void 0);
__decorate([
    property({ attribute: false })
], KanbanAssignModalElement.prototype, "card", void 0);
__decorate([
    property({ attribute: false })
], KanbanAssignModalElement.prototype, "beUsers", void 0);
KanbanAssignModalElement = __decorate([
    customElement('typo3-kanban-assign-modal')
], KanbanAssignModalElement);
export { KanbanAssignModalElement };
