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
import '@web-vision/kanban-workspaces/components/card.js';
/**
 * A board column for a single workspace stage. Renders its (already filtered)
 * cards as `<typo3-kanban-card>` children and manages the drop target: dropping
 * a card dispatches a `column-drop` event the board turns into a stage
 * transition. The host uses `display: contents` so the inner `.kanban-column`
 * remains the grid item.
 */
let KanbanColumnElement = class KanbanColumnElement extends LitElement {
    constructor() {
        super(...arguments);
        this.cards = [];
        this.selectedCards = new Set();
    }
    createRenderRoot() {
        return this;
    }
    onDragOver(e) {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }
        e.currentTarget.classList.add('drag-over');
    }
    onDragLeave(e) {
        const content = e.currentTarget;
        if (!content.contains(e.relatedTarget)) {
            content.classList.remove('drag-over');
        }
    }
    onDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const cardId = e.dataTransfer?.getData('text/plain');
        if (cardId) {
            this.dispatchEvent(new CustomEvent('column-drop', {
                detail: { stageId: this.stage.id, cardId },
                bubbles: true,
                composed: true,
            }));
        }
    }
    render() {
        const stage = this.stage;
        return html `
      <div class="kanban-column stage-${stage.id}" data-stage-id=${stage.id}>
        <div class="column-header">
          <div class="column-title-row">
            <div class="column-title-main">
              <div class="stage-indicator" style=${`background-color: ${stage.color || 'var(--typo3-orange)'}`}></div>
              <span class="column-name">${stage.label}</span>
              <span class="column-count">${this.cards.length}</span>
            </div>
            <div class="column-actions"></div>
          </div>
        </div>
        <div class="column-content" data-stage-id=${stage.id}
          @dragover=${(e) => this.onDragOver(e)}
          @dragleave=${(e) => this.onDragLeave(e)}
          @drop=${(e) => this.onDrop(e)}>
          ${this.cards.length === 0
            ? html `<div class="column-empty">No items in this stage</div>`
            : this.cards.map((card) => html `
                <typo3-kanban-card .card=${card} ?selected=${this.selectedCards.has(card.id)}></typo3-kanban-card>`)}
        </div>
      </div>`;
    }
};
__decorate([
    property({ attribute: false })
], KanbanColumnElement.prototype, "stage", void 0);
__decorate([
    property({ attribute: false })
], KanbanColumnElement.prototype, "cards", void 0);
__decorate([
    property({ attribute: false })
], KanbanColumnElement.prototype, "selectedCards", void 0);
KanbanColumnElement = __decorate([
    customElement('typo3-kanban-column')
], KanbanColumnElement);
export { KanbanColumnElement };
