import { html, nothing, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import { getTypeIcon, formatDate } from '@web-vision/kanban-workspaces/core/utils.js';
import type { Card, CardUser } from '@web-vision/kanban-workspaces/types.js';

/**
 * A single kanban card. Presentational: it renders the card markup and emits
 * DOM events (`card-click`, `card-menu`, `card-dragstart`, `card-dragend`) that
 * the board coordinates. The host uses `display: contents` (see SCSS) so the
 * inner `.kanban-card` stays the flex item and existing styles apply unchanged.
 */
@customElement('typo3-kanban-card')
export class KanbanCardElement extends LitElement {
  @property({ attribute: false }) card: Card;
  @property({ type: Boolean }) selected = false;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private emit(type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail: { card: this.card, ...detail }, bubbles: true, composed: true }));
  }

  private onDragStart(e: DragEvent): void {
    e.dataTransfer?.setData('text/plain', String(this.card.id));
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
    this.emit('card-dragstart', { element: e.currentTarget });
  }

  private renderIntegrity(): TemplateResult | typeof nothing {
    const status = this.card.integrityStatus;
    if (!status || status === 'success' || status === 'info') {
      return nothing;
    }
    const iconMap: Record<string, string> = { info: 'fa-info-circle', warning: 'fa-exclamation-triangle', error: 'fa-exclamation-circle' };
    const labelMap: Record<string, string> = { info: 'Info', warning: 'Warning', error: 'Error' };
    const messages = this.card.integrityMessages || 'Integrity check';
    return html`
      <div class="card-integrity integrity-${status}" title=${messages}>
        <i class="fas ${iconMap[status] || 'fa-info-circle'}"></i>
        <span class="integrity-label">${labelMap[status] || 'Info'}</span>
      </div>`;
  }

  private renderAssignees(): TemplateResult | typeof nothing {
    const assignees: CardUser[] = this.card.assignee ? [this.card.assignee] : (this.card.assignedUsers || []);
    if (assignees.length === 0) {
      return nothing;
    }
    return html`<div class="card-assignees">${assignees.map((u) => {
      const title = u.username || 'UID ' + u.uid;
      const initial = (u.username || 'U' + u.uid).charAt(0).toUpperCase();
      if (u.avatar_url) {
        return html`<span class="user-avatar" title=${title}><img
            src=${u.avatar_url} alt=${title} loading="lazy"
            @error=${(e: Event) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const next = img.nextElementSibling as HTMLElement | null;
              if (next) { next.style.display = 'flex'; }
            }} /><span class="user-avatar-initial" style="display:none">${initial}</span></span>`;
      }
      return html`<span class="user-avatar" title=${title}>${initial}</span>`;
    })}</div>`;
  }

  protected override render(): TemplateResult {
    const card = this.card;
    const assignees = card.assignee ? [card.assignee] : (card.assignedUsers || []);
    return html`
      <div
        class="kanban-card ${card.priority ? `priority-${card.priority}` : ''} ${this.selected ? 'selected' : ''}"
        data-card-id=${card.id}
        data-integrity-status=${card.integrityStatus || 'success'}
        draggable="true"
        role="button"
        tabindex="0"
        aria-label="Card: ${card.title}"
        @click=${() => this.emit('card-click')}
        @dragstart=${(e: DragEvent) => this.onDragStart(e)}
        @dragend=${(e: DragEvent) => this.emit('card-dragend', { element: e.currentTarget })}>
        <div class="card-header">
          <div class="card-type">
            <i class=${getTypeIcon(card.type)}></i>
            <span>${card.type}</span>
          </div>
          <div class="card-indicators">
            ${this.renderIntegrity()}
            ${card.attachments && card.attachments.length > 0 ? html`
              <div class="card-attachments"><i class="fas fa-paperclip"></i><span>${card.attachments.length}</span></div>` : nothing}
          </div>
          <button class="card-menu" title="Card actions" aria-label="Card menu"
            @click=${(e: Event) => { e.stopPropagation(); this.emit('card-menu', { anchor: e.currentTarget }); }}>
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

        ${card.integrityMessages && card.integrityStatus !== 'success' ? html`
          <div class="card-integrity-messages"><i class="fas fa-info-circle"></i><span>${card.integrityMessages}</span></div>` : nothing}

        <div class="card-badges">
          ${card.hasSchedule ? html`<span class="card-badge schedule"><i class="fas fa-clock"></i>${card.scheduleText}</span>` : nothing}
          ${card.dueDate ? html`<div class="card-due-date"><i class="fas fa-calendar-alt"></i><span>${formatDate(card.dueDate)}</span></div>` : nothing}
        </div>
        <div class="card-footer">
          <div class="card-language">
            ${card.language?.icon
              ? html`<typo3-backend-icon identifier=${card.language.icon} size="small"></typo3-backend-icon>`
              : html`<span class="t3js-icon icon icon-size-small icon-state-default"><span class="icon-markup">🌐</span></span>`}
            ${(card.languageCode || 'en').toUpperCase()}
          </div>
          ${this.renderAssignees()}
          <div class="card-stats">
            ${card.comments && card.comments > 0 ? html`<div class="card-comments"><i class="fas fa-comment"></i><span>${card.comments}</span></div>` : nothing}
          </div>
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-card': KanbanCardElement;
  }
}
