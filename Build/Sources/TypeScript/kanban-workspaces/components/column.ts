import { html, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@web-vision/kanban-workspaces/components/card.js';
import type { Card, Stage } from '@web-vision/kanban-workspaces/types.js';

/**
 * A board column for a single workspace stage. Renders its (already filtered)
 * cards as `<typo3-kanban-card>` children and manages the drop target: dropping
 * a card dispatches a `column-drop` event the board turns into a stage
 * transition. The host uses `display: contents` so the inner `.kanban-column`
 * remains the grid item.
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

  protected override render(): TemplateResult {
    const stage = this.stage;
    return html`
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
