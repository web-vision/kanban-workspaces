import { html, nothing, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { formatDate } from '@web-vision/kanban-workspaces/core/utils.js';
import type { PublishedRecord } from '@web-vision/kanban-workspaces/types.js';

// PublishedHistoryService::MAX_AGE_DAYS, the AJAX controller clamps to it as well.
const maxDays = 365;

const fallbackLabels: Record<string, string> = {
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
function label(key: string, ...args: (string | number)[]): string {
  const text: string = TYPO3?.lang?.[key] || fallbackLabels[key] || key;
  return args.reduce<string>((result, arg) => result.replace('%s', String(arg)), text);
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
@customElement('typo3-kanban-published-column')
export class KanbanPublishedColumnElement extends LitElement {
  @property({ attribute: false }) records: PublishedRecord[] = [];
  @property({ type: Number }) days = 0;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private handleDaysChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const days = Math.round(input.valueAsNumber);
    if (!input.checkValidity() || !Number.isFinite(days) || days === this.days) {
      input.value = String(this.days);
      return;
    }
    this.dispatchEvent(new CustomEvent('published-days-change', { detail: { days }, bubbles: true }));
  }

  // The description label with its %s replaced by the days input.
  private renderDescription(): TemplateResult {
    const [before, after = ''] = label('publishedHistory.description').split('%s');
    return html`${before}<input type="number" class="form-control form-control-sm published-days-input"
      min="1" max=${maxDays} step="1" required .value=${String(this.days)}
      aria-label=${label('publishedHistory.days')} title=${label('publishedHistory.days')}
      @change=${(e: Event) => this.handleDaysChange(e)}>${after}`;
  }

  private historyUrl(record: PublishedRecord): string {
    return `${record.historyUrl}&returnUrl=${encodeURIComponent(window.location.href)}`;
  }

  private renderRecord(record: PublishedRecord): TemplateResult {
    return html`
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

        ${record.comment ? html`
          <div class="published-comment"><i class="fas fa-comment"></i><span>${record.comment}</span></div>` : nothing}
      </a>`;
  }

  protected override render(): TemplateResult {
    return html`
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
            ? html`<div class="column-empty">${label('publishedHistory.empty', this.days)}</div>`
            : this.records.map((record) => this.renderRecord(record))}
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-published-column': KanbanPublishedColumnElement;
  }
}
