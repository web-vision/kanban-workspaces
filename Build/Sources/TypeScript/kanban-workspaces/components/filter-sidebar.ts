import { html, nothing, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { FilterConfig, FilterOption } from '@web-vision/kanban-workspaces/types.js';

const SELECT_FILTERS = ['depth', 'language', 'stage'];

/**
 * Filter sidebar. Renders the configured filter groups (selects for
 * depth/language/stage, checkboxes otherwise) and emits `filter-change`,
 * `filter-clear` and `sidebar-close`. Open state is driven by the board.
 */
@customElement('typo3-kanban-filter-sidebar')
export class KanbanFilterSidebarElement extends LitElement {
  @property({ attribute: false }) filters: Record<string, FilterConfig> = {};
  @property({ attribute: false }) activeFilters: Record<string, string[]> = {};
  @property({ type: Boolean }) open = false;

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
        @click=${(e: Event) => e.stopPropagation()}
        @mousedown=${(e: Event) => e.stopPropagation()}
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
      <div class="filter-group">
        <h3 class="filter-group-title">${config.label}</h3>
        <div class="filter-options">
          <div class="filter-option" style="pointer-events: auto;">
            ${filterType === 'language'
              ? html`
                <div class="input-group filter-language-input-group">
                  <span class="input-group-text input-group-icon">${languageFlagHtml ? unsafeHTML(languageFlagHtml) : nothing}</span>
                  ${select}
                </div>`
              : select}
          </div>
        </div>
      </div>`;
  }

  private renderCheckboxGroup(filterType: string, config: FilterConfig): TemplateResult {
    return html`
      <div class="filter-group">
        <h3 class="filter-group-title">${config.label}</h3>
        <div class="filter-options">
          ${config.options.map((option: FilterOption) => html`
            <div class="filter-option">
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
            </div>`)}
        </div>
      </div>`;
  }

  protected override render(): TemplateResult {
    return html`
      <aside class="filter-sidebar ${this.open ? 'open' : ''}" id="filterSidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">
            <i class="fas fa-filter"></i>
            <span>Filters</span>
          </div>
          <button class="sidebar-close" id="closeSidebar" @click=${() => this.emit('sidebar-close')}>
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="sidebar-content">
          <div class="filter-actions">
            <span class="active-filters-count">Active filters:
              <span id="activeFiltersCount">${Object.values(this.activeFilters).reduce((total: number, list: any) => total + (list?.length || 0), 0)}</span></span>
            <button class="clear-filters" id="clearAllFilters" @click=${() => this.emit('filter-clear')}>Clear all</button>
          </div>
          <div class="filter-groups" id="filterGroups">
            ${Object.entries(this.filters).map(([filterType, config]: [string, FilterConfig]) =>
              SELECT_FILTERS.includes(filterType)
                ? this.renderSelectGroup(filterType, config)
                : this.renderCheckboxGroup(filterType, config))}
          </div>
        </div>
      </aside>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-filter-sidebar': KanbanFilterSidebarElement;
  }
}
