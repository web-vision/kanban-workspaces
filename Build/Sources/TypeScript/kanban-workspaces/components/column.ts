import { html, nothing, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@web-vision/kanban-workspaces/components/card.js';
import type { Card, Stage } from '@web-vision/kanban-workspaces/types.js';

/**
 * A board column for a single workspace stage. Renders its (already filtered)
 * cards as `<typo3-kanban-card>` children and manages the drop target: dropping
 * a card dispatches a `column-drop` event the board turns into a stage
 * transition. The header checkbox (de)selects all cards of the column via a
 * `column-select` event; the "Publish" column has none, as cards dropped there
 * are published and cannot be moved on. The host uses `display: contents` so
 * the inner `.kanban-column` remains the grid item.
 */
@customElement('typo3-kanban-column')
export class KanbanColumnElement extends LitElement {
  @property({ attribute: false }) stage: Stage;
  @property({ attribute: false }) cards: Card[] = [];
  @property({ attribute: false }) selectedCards: Set<string | number> = new Set();

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  }

  private onDragLeave(e: DragEvent): void {
    const content = e.currentTarget as HTMLElement;
    if (!content.contains(e.relatedTarget as Node)) {
      content.classList.remove('drag-over');
    }
  }

  private onDrop(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const cardId = e.dataTransfer?.getData('text/plain');
    if (cardId) {
      this.dispatchEvent(new CustomEvent('column-drop', {
        detail: { stageId: this.stage.id, cardId },
        bubbles: true,
        composed: true,
      }));
    }
  }

  private onSelectAll(e: Event): void {
    this.dispatchEvent(new CustomEvent('column-select', {
      detail: { cardIds: this.cards.map((card) => card.id), selected: (e.target as HTMLInputElement).checked },
      bubbles: true,
      composed: true,
    }));
  }

  protected override render(): TemplateResult {
    const stage = this.stage;
    const selectedCount = this.cards.filter((card) => this.selectedCards.has(card.id)).length;
    return html`
      <div class="kanban-column stage-${stage.id}" data-stage-id=${stage.id}>
        <div class="column-header">
          <div class="column-title-row">
            <div class="column-title-main">
              ${stage.isExecuteStage ? nothing : html`
                <span class="form-check column-select-wrapper">
                  <input type="checkbox" class="form-check-input column-select"
                    title="Select all cards in this column" aria-label="Select all cards in ${stage.label}"
                    ?disabled=${this.cards.length === 0}
                    .checked=${this.cards.length > 0 && selectedCount === this.cards.length}
                    .indeterminate=${selectedCount > 0 && selectedCount < this.cards.length}
                    @change=${(e: Event) => this.onSelectAll(e)}>
                </span>`}
              <div class="stage-indicator" style=${`background-color: ${stage.color || 'var(--typo3-orange)'}`}></div>
              <span class="column-name">${stage.label}</span>
              <span class="column-count">${this.cards.length}</span>
              ${selectedCount > 0 ? html`<span class="selected-count">${selectedCount} selected</span>` : nothing}
            </div>
            <div class="column-actions"></div>
          </div>
        </div>
        <div class="column-content" data-stage-id=${stage.id}
          @dragover=${(e: DragEvent) => this.onDragOver(e)}
          @dragleave=${(e: DragEvent) => this.onDragLeave(e)}
          @drop=${(e: DragEvent) => this.onDrop(e)}>
          ${this.cards.length === 0
            ? html`<div class="column-empty">No items in this stage</div>`
            : this.cards.map((card) => html`
                <typo3-kanban-card .card=${card} ?selected=${this.selectedCards.has(card.id)}></typo3-kanban-card>`)}
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-column': KanbanColumnElement;
  }
}
