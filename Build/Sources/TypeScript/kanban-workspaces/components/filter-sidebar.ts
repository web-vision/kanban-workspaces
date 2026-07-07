import { html, nothing, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
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

  private renderSelectGroup(filterType: string, config: FilterConfig): TemplateResult {
    const selected = this.selectedValue(filterType);
    return html`
      <div class="filter-group">
        <h3 class="filter-group-title">${config.label}</h3>
        <div class="filter-options">
          <div class="filter-option" style="pointer-events: auto;">
            <select id="filter-${filterType}" class="filter-select" tabindex="0"
              @click=${(e: Event) => e.stopPropagation()}
              @mousedown=${(e: Event) => e.stopPropagation()}
              @change=${(e: Event) => {
                e.stopPropagation();
                this.emit('filter-change', { filterType, value: (e.target as HTMLSelectElement).value, active: true, single: true });
              }}>
              ${filterType === 'language' ? html`<option value="all">All Languages</option>` : nothing}
              ${filterType === 'stage' ? html`<option value="-99">All Stages</option>` : nothing}
              ${config.options.map((option: FilterOption) => html`
                <option value=${option.id} ?selected=${String(option.id) === selected}>
                  ${option.flag ? option.flag + ' ' : ''}${option.label}
                </option>`)}
            </select>
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
                ${option.flag ? option.flag : ''}
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
