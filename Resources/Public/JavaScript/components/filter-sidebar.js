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
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
const SELECT_FILTERS = ['depth', 'language', 'stage'];
/**
 * Filter sidebar. Renders the configured filter groups (selects for
 * depth/language/stage, checkboxes otherwise) and emits `filter-change`,
 * `filter-clear` and `sidebar-close`. Open state is driven by the board.
 */
let KanbanFilterSidebarElement = class KanbanFilterSidebarElement extends LitElement {
    constructor() {
        super(...arguments);
        this.filters = {};
        this.activeFilters = {};
        this.open = false;
    }
    createRenderRoot() {
        return this;
    }
    isFilterActive(filterType, value) {
        return (this.activeFilters[filterType] || []).includes(String(value));
    }
    emit(type, detail = {}) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
    selectedValue(filterType) {
        const active = this.activeFilters[filterType];
        if (active && active.length > 0) {
            return String(active[0]);
        }
        return filterType === 'depth' ? '0' : filterType === 'language' ? 'all' : '-99';
    }
    onSelectChange(filterType, e) {
        e.stopPropagation();
        this.emit('filter-change', { filterType, value: e.target.value, active: true, single: true });
    }
    renderSelectGroup(filterType, config) {
        const selected = this.selectedValue(filterType);
        const select = html `
      <select id="filter-${filterType}" class="filter-select" tabindex="0"
        @click=${(e) => e.stopPropagation()}
        @mousedown=${(e) => e.stopPropagation()}
        @change=${(e) => this.onSelectChange(filterType, e)}>
        ${filterType === 'stage' ? html `<option value="-99">All Stages</option>` : nothing}
        ${config.options.map((option) => html `
          <option value=${option.id} ?selected=${String(option.id) === selected}>
            ${option.label}
          </option>`)}
      </select>`;
        // Language flags cannot live inside <option> text; show the selected
        // language's pre-rendered core icon in the input-group prefix instead.
        const languageFlagHtml = filterType === 'language'
            ? config.options.find((option) => String(option.id) === selected)?.flagHtml
            : undefined;
        return html `
      <div class="filter-group">
        <h3 class="filter-group-title">${config.label}</h3>
        <div class="filter-options">
          <div class="filter-option" style="pointer-events: auto;">
            ${filterType === 'language'
            ? html `
                <div class="input-group filter-language-input-group">
                  <span class="input-group-text input-group-icon">${languageFlagHtml ? unsafeHTML(languageFlagHtml) : nothing}</span>
                  ${select}
                </div>`
            : select}
          </div>
        </div>
      </div>`;
    }
    renderCheckboxGroup(filterType, config) {
        return html `
      <div class="filter-group">
        <h3 class="filter-group-title">${config.label}</h3>
        <div class="filter-options">
          ${config.options.map((option) => html `
            <div class="filter-option">
              <input type="checkbox" id="filter-${filterType}-${option.id}"
                .checked=${this.isFilterActive(filterType, option.id)}
                @change=${(e) => this.emit('filter-change', {
            filterType,
            value: String(option.id),
            active: e.target.checked,
        })}>
              <label for="filter-${filterType}-${option.id}">
                ${option.icon ? html `<i class=${option.icon}></i>` : nothing}
                ${option.label}
              </label>
            </div>`)}
        </div>
      </div>`;
    }
    render() {
        return html `
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
              <span id="activeFiltersCount">${Object.values(this.activeFilters).reduce((total, list) => total + (list?.length || 0), 0)}</span></span>
            <button class="clear-filters" id="clearAllFilters" @click=${() => this.emit('filter-clear')}>Clear all</button>
          </div>
          <div class="filter-groups" id="filterGroups">
            ${Object.entries(this.filters).map(([filterType, config]) => SELECT_FILTERS.includes(filterType)
            ? this.renderSelectGroup(filterType, config)
            : this.renderCheckboxGroup(filterType, config))}
          </div>
        </div>
      </aside>`;
    }
};
__decorate([
    property({ attribute: false })
], KanbanFilterSidebarElement.prototype, "filters", void 0);
__decorate([
    property({ attribute: false })
], KanbanFilterSidebarElement.prototype, "activeFilters", void 0);
__decorate([
    property({ type: Boolean })
], KanbanFilterSidebarElement.prototype, "open", void 0);
KanbanFilterSidebarElement = __decorate([
    customElement('typo3-kanban-filter-sidebar')
], KanbanFilterSidebarElement);
export { KanbanFilterSidebarElement };
