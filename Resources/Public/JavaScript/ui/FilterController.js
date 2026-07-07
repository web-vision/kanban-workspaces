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
/**
 * Owns search and filter interaction: keeps the board's active filters and
 * search query in sync, persists selections through the API and triggers
 * reloads / re-renders on the owning board.
 */
export class FilterController {
    board;
    constructor(board) {
        this.board = board;
    }
    // Event handlers
    handleSearch(query) {
        this.board.data.searchQuery = query;
        const clearBtn = document.getElementById("clearSearch");
        if (clearBtn) {
            clearBtn.style.display = query ? "block" : "none";
        }
        this.board.renderer.renderBoard();
        this.board.emit("search:change", query);
    }
    clearSearch() {
        const searchInput = document.getElementById("globalSearch");
        if (searchInput) {
            searchInput.value = "";
        }
        this.handleSearch("");
        this.board.emit("search:clear");
    }
    toggleFilters() {
        const sidebar = document.getElementById("filterSidebar");
        const toggle = document.getElementById("filterToggle");
        const container = document.querySelector(".kanban-container");
        if (sidebar && toggle && container) {
            const isOpen = sidebar.classList.contains("open");
            if (isOpen) {
                sidebar.classList.remove("open");
                toggle.classList.remove("active");
                container.classList.remove("sidebar-open");
            }
            else {
                sidebar.classList.add("open");
                toggle.classList.add("active");
                container.classList.add("sidebar-open");
            }
        }
    }
    handleFilterChange(filterType, filterValue, isActive) {
        if (!this.board.data.activeFilters) {
            this.board.data.activeFilters = {};
        }
        if (!this.board.data.activeFilters[filterType]) {
            this.board.data.activeFilters[filterType] = [];
        }
        if (isActive) {
            if (!this.board.data.activeFilters[filterType].includes(filterValue)) {
                this.board.data.activeFilters[filterType].push(filterValue);
            }
        }
        else {
            this.board.data.activeFilters[filterType] = this.board.data.activeFilters[filterType].filter((value) => value !== filterValue);
            if (this.board.data.activeFilters[filterType].length === 0) {
                delete this.board.data.activeFilters[filterType];
            }
        }
        this.updateActiveFiltersCount();
        this.board.api.processData('set', filterType, filterValue);
        this.board.loadData();
        // this.board.renderer.renderBoard()
    }
    handleFilterClear() {
        this.board.data.activeFilters = {};
        const checkboxes = document.querySelectorAll('#filterGroups input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });
        // Reset all selectboxes to their default values
        const depthSelect = document.querySelector('#filter-depth');
        if (depthSelect) {
            depthSelect.value = '0'; // This Page
            this.board.api.processData('clear', 'depth', '0');
        }
        const languageSelect = document.querySelector('#filter-language');
        if (languageSelect) {
            languageSelect.value = 'all'; // All Languages
            this.board.api.processData('clear', 'language', 'all');
        }
        const stageSelect = document.querySelector('#filter-stage');
        if (stageSelect) {
            stageSelect.value = '-99'; // All Stages
            this.board.api.processData('clear', 'stage', '-99');
        }
        this.updateActiveFiltersCount();
        this.board.loadData();
        // this.board.renderer.renderBoard()
    }
    handleSearchChange(query) {
        // Additional search handling if needed
        this.board.apiPayload.data[0].filterTxt = query;
        this.board.loadData();
    }
    handleSearchClear() {
        // Additional search clear handling if needed
    }
    handleThemeChange(oldTheme, newTheme) {
        // Additional theme change handling if needed
    }
    handleResize() {
        this.board.renderer.updateUI();
    }
    isFilterActive(filterType, filterValue) {
        return this.board.data.activeFilters[filterType] && this.board.data.activeFilters[filterType].includes(filterValue);
    }
    updateActiveFiltersCount() {
        const count = Object.values(this.board.data.activeFilters).reduce((total, filters) => total + filters.length, 0);
        const countElement = document.getElementById("activeFiltersCount");
        if (countElement) {
            countElement.textContent = String(count);
        }
    }
}
