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
/**
 * "Send to stage" modal. Presents the recipients / checklist / comments form
 * built from the TYPO3 window response and emits `send-submit` with the
 * collected values (or `send-cancel`). All persistence is done by the board.
 */
let KanbanSendToStageModalElement = class KanbanSendToStageModalElement extends LitElement {
    constructor() {
        super(...arguments);
        this.open = false;
        this.formData = null;
        this.context = null;
        this.pending = false;
    }
    createRenderRoot() {
        return this;
    }
    // Prefill the (uncontrolled) textareas once when the modal opens, so a later
    // re-render (e.g. the pending flag toggling) does not wipe user input.
    updated(changed) {
        if (changed.has('open') && this.open) {
            const comments = this.querySelector('#stageComments');
            if (comments) {
                comments.value = this.formData?.comments?.value || '';
            }
            const additional = this.querySelector('#stageAdditionalRecipients');
            if (additional) {
                additional.value = this.formData?.additional?.value || '';
            }
        }
    }
    emit(type, detail = {}) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    onOverlayClick(e) {
        if (e.target.id === 'sendToStageModal') {
            this.emit('send-cancel');
        }
    }
    submit() {
        const comments = this.querySelector('#stageComments')?.value || '';
        const additional = this.querySelector('#stageAdditionalRecipients')?.value || '';
        const recipients = Array.from(this.querySelectorAll('.t3js-workspace-recipient:checked')).map((cb) => cb.value);
        this.emit('send-submit', { comments, additional, recipients });
    }
    checklistItems() {
        const raw = this.context?.targetStage?.checklist || [];
        const seen = new Set();
        return raw.filter((item) => {
            const key = String(item.id ?? item.uid ?? item.title ?? '');
            if (!item.title || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    render() {
        const formData = this.formData || {};
        const targetStage = this.context?.targetStage;
        const recipients = formData.sendMailTo || [];
        const checklist = this.checklistItems();
        const count = this.context?.cardIds?.length || 1;
        return html `
      <div class="modal-overlay" id="sendToStageModal" style=${`display: ${this.open ? 'flex' : 'none'}`}
        @click=${(e) => this.onOverlayClick(e)}>
        <div class="modal modal-dialog modal-xl" role="dialog" aria-modal="true">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title-section">
                <h4 class="modal-title">Send to Stage</h4>
              </div>
              <button class="modal-close btn-close" aria-label="Close" @click=${() => this.emit('send-cancel')}>
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="modal-body">
              ${targetStage ? html `
                <div class="stage-info-banner" style="display: flex;">
                  <i class="fas fa-info-circle"></i>
                  <span>Sending ${count > 1 ? `${count} items` : 'item'} to ${targetStage.label}</span>
                </div>` : nothing}

              ${checklist.length > 0 ? html `
                <div class="form-group stage-checklist-section" style="display: block;">
                  <label class="form-label">Checklist</label>
                  <ul class="stage-checklist-ul">
                    ${checklist.map((item) => html `
                      <li class="stage-checklist-item">
                        <span class="stage-checklist-item-icon">
                          <typo3-backend-icon identifier="kanban-workspaces-stage-checklist" size="small"></typo3-backend-icon>
                        </span>${item.title}
                      </li>`)}
                  </ul>
                </div>` : nothing}

              ${recipients.length > 0 ? html `
                <div class="form-group" id="recipientsGroup">
                  <label class="form-label">Recipients</label>
                  <div class="stage-recipients">
                    ${recipients.map((recipient) => html `
                      <div class="stage-recipient">
                        <input type="checkbox" class="t3js-workspace-recipient" id=${recipient.name}
                          value=${recipient.value} ?checked=${recipient.checked} ?disabled=${recipient.disabled}>
                        <label for=${recipient.name}>${recipient.label}</label>
                      </div>`)}
                  </div>
                </div>` : nothing}

              ${formData.additional ? html `
                <div class="form-group" id="additionalRecipientsGroup">
                  <label for="stageAdditionalRecipients" class="form-label">Additional recipients</label>
                  <textarea class="form-control" id="stageAdditionalRecipients" rows="2"
                    placeholder="One recipient per line"></textarea>
                  <div class="form-text">One recipient per line</div>
                </div>` : nothing}

              <div class="form-group">
                <label for="stageComments" class="form-label">Comments</label>
                <textarea class="form-control" id="stageComments" rows="4" placeholder="Add a comment..."></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <div class="modal-actions-left"></div>
              <div class="modal-actions-right">
                <button class="btn btn-outline" @click=${() => this.emit('send-cancel')}>Cancel</button>
                <button class="btn btn-primary" ?disabled=${this.pending} @click=${() => this.submit()}>
                  <i class="fas ${this.pending ? 'fa-spinner fa-spin' : 'fa-check'}"></i> Send to Stage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }
};
__decorate([
    property({ type: Boolean })
], KanbanSendToStageModalElement.prototype, "open", void 0);
__decorate([
    property({ attribute: false })
], KanbanSendToStageModalElement.prototype, "formData", void 0);
__decorate([
    property({ attribute: false })
], KanbanSendToStageModalElement.prototype, "context", void 0);
__decorate([
    property({ type: Boolean })
], KanbanSendToStageModalElement.prototype, "pending", void 0);
KanbanSendToStageModalElement = __decorate([
    customElement('typo3-kanban-send-to-stage-modal')
], KanbanSendToStageModalElement);
export { KanbanSendToStageModalElement };
