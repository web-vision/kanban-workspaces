import { html, nothing, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { FilterConfig, FilterOption } from '@web-vision/kanban-workspaces/types.js';

const SELECT_FILTERS = ['depth', 'language', 'stage'];

/**
 * Inline filter bar rendered in the board toolbar, left of the search input.
 * Renders the configured filter groups (selects for depth/language/stage,
 * checkboxes otherwise) and emits `filter-change` and `filter-clear`.
 */
@customElement('typo3-kanban-filter-bar')
export class KanbanFilterBarElement extends LitElement {
  @property({ attribute: false }) filters: Record<string, FilterConfig> = {};
  @property({ attribute: false }) activeFilters: Record<string, string[]> = {};

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private isFilterActive(filterType: string, value: string | number): boolean {
    return (this.activeFilters[filterType] || []).includes(String(value));
  }

  private emit(type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private selectedValue(filterType: string): string {
    const active = this.activeFilters[filterType];
    if (active && active.length > 0) {
      return String(active[0]);
    }
    return filterType === 'depth' ? '0' : filterType === 'language' ? 'all' : '-99';
  }

  private onSelectChange(filterType: string, e: Event): void {
    e.stopPropagation();
    this.emit('filter-change', { filterType, value: (e.target as HTMLSelectElement).value, active: true, single: true });
  }

  private renderSelectGroup(filterType: string, config: FilterConfig): TemplateResult {
    const selected = this.selectedValue(filterType);
    const select = html`
      <select id="filter-${filterType}" class="filter-select" tabindex="0"
        @change=${(e: Event) => this.onSelectChange(filterType, e)}>
        ${filterType === 'stage' ? html`<option value="-99">All Stages</option>` : nothing}
        ${config.options.map((option: FilterOption) => html`
          <option value=${option.id} ?selected=${String(option.id) === selected}>
            ${option.label}
          </option>`)}
      </select>`;

    // Language flags cannot live inside <option> text; show the selected
    // language's pre-rendered core icon in the input-group prefix instead.
    const languageFlagHtml = filterType === 'language'
      ? config.options.find((option: FilterOption) => String(option.id) === selected)?.flagHtml
      : undefined;

    return html`
      <div class="filter-bar-group">
        <label class="filter-bar-label" for="filter-${filterType}">${config.label}</label>
        ${filterType === 'language'
          ? html`
            <div class="input-group filter-language-input-group">
              <span class="input-group-text input-group-icon">${languageFlagHtml ? unsafeHTML(languageFlagHtml) : nothing}</span>
              ${select}
            </div>`
          : select}
      </div>`;
  }

  private renderCheckboxGroup(filterType: string, config: FilterConfig): TemplateResult {
    return html`
      <div class="filter-bar-group">
        <span class="filter-bar-label">${config.label}</span>
        ${config.options.map((option: FilterOption) => html`
          <span class="filter-bar-option">
            <input type="checkbox" id="filter-${filterType}-${option.id}"
              .checked=${this.isFilterActive(filterType, option.id)}
              @change=${(e: Event) => this.emit('filter-change', {
                filterType,
                value: String(option.id),
                active: (e.target as HTMLInputElement).checked,
              })}>
            <label for="filter-${filterType}-${option.id}">
              ${option.icon ? html`<i class=${option.icon}></i>` : nothing}
              ${option.label}
            </label>
          </span>`)}
      </div>`;
  }

  protected override render(): TemplateResult {
    return html`
      <div class="filter-bar" id="filterBar">
        ${Object.entries(this.filters).map(([filterType, config]: [string, FilterConfig]) =>
          SELECT_FILTERS.includes(filterType)
            ? this.renderSelectGroup(filterType, config)
            : this.renderCheckboxGroup(filterType, config))}
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-filter-bar': KanbanFilterBarElement;
  }
}
