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
import { EventEmitter } from '@web-vision/kanban-workspaces/core/EventEmitter.js';
import { showLoading, hideLoading, showToast, debounce } from '@web-vision/kanban-workspaces/core/utils.js';
import { DataTransformer } from '@web-vision/kanban-workspaces/data/DataTransformer.js';
import { WorkspaceApi } from '@web-vision/kanban-workspaces/data/WorkspaceApi.js';
import { BoardRenderer } from '@web-vision/kanban-workspaces/ui/BoardRenderer.js';
import { DragController } from '@web-vision/kanban-workspaces/ui/DragController.js';
import { ModalController } from '@web-vision/kanban-workspaces/ui/ModalController.js';
import { FilterController } from '@web-vision/kanban-workspaces/ui/FilterController.js';
import { CardActions } from '@web-vision/kanban-workspaces/ui/CardActions.js';
/**
 * TYPO3 Workspace Board
 *
 * Central orchestrator for the kanban board. It owns the shared state (cards,
 * stages, filters, selection, undo/redo history) and the lifecycle wiring, and
 * delegates the actual work to focused collaborators:
 *
 *   - api          {@link WorkspaceApi}      AJAX transport
 *   - transformer  {@link DataTransformer}   API payload -> view model
 *   - renderer     {@link BoardRenderer}     columns / cards / filters markup
 *   - drag         {@link DragController}    drag-and-drop + drop targets
 *   - modals       {@link ModalController}   preview / send-to-stage modals
 *   - filters      {@link FilterController}  search + filter handling
 *   - cardActions  {@link CardActions}       context-menu card operations
 *
 * Collaborators reach shared state and each other through their `board`
 * reference (e.g. `this.board.data`, `this.board.renderer.renderBoard()`).
 */
export class WorkspaceBoard {
    container;
    options;
    events;
    data;
    ui;
    apiPayload;
    actionHistory;
    historyIndex;
    transformer;
    api;
    renderer;
    drag;
    modals;
    filters;
    cardActions;
    handleResize;
    constructor(container, options) {
        this.container = typeof container === "string" ? document.querySelector(container) : container;
        this.options = Object.assign({}, WorkspaceBoard.defaults, options);
        this.events = new EventEmitter();
        this.data = {
            cards: [],
            stages: [],
            filters: {},
            activeFilters: {},
            currentWorkspace: "main",
            searchQuery: "",
            columnUserFilters: {},
            columnSorts: {},
            diffs: {}, // Stores TYPO3 diff data per card
            comments: {}, // Stores comments per card
            history: {}, // Stores history per card
        };
        this.ui = {
            draggedCard: null,
            draggedElement: null,
            dropZone: null,
            selectedCards: new Set(),
            isMultiSelectMode: false,
        };
        // API payload for fetching workspace data
        this.apiPayload = {
            action: "RemoteServer",
            method: "getWorkspaceInfos",
            data: [{
                    id: parseInt(new URL(window.location.href).searchParams.get("id"), 10),
                    depth: "0",
                    language: 'all',
                    limit: 30,
                    query: '',
                    start: 0,
                    filterTxt: '',
                    stage: '-99', // Default to all stages
                }]
        };
        // Action history for undo/redo
        this.actionHistory = [];
        this.historyIndex = -1;
        // Collaborators
        this.transformer = new DataTransformer();
        this.api = new WorkspaceApi(this);
        this.renderer = new BoardRenderer(this);
        this.drag = new DragController(this);
        this.modals = new ModalController(this);
        this.filters = new FilterController(this);
        this.cardActions = new CardActions(this);
        this.init();
    }
    // Default options
    static defaults = {
        apiUrl: "/typo3/ajax/workspace",
        enableDragDrop: true,
        enableFilters: true,
        enableSearch: true,
        enableComments: true,
        autoSave: true,
        autoSaveDelay: 2000,
        animations: true,
        mockData: false,
    };
    // Initialize the workspace board
    init() {
        this.loadConfiguration();
        this.setupEventListeners();
        this.loadData();
        this.renderer.render();
        // Emit initialization event in next tick to ensure listeners are registered
        setTimeout(() => {
            this.emit("board:initialized", this);
        }, 0);
    }
    // Load configuration from global config
    loadConfiguration() {
        if (window.WorkspaceConfig) {
            this.data.stages = [...window.WorkspaceConfig.stages];
            this.data.filters = { ...window.WorkspaceConfig.filters };
            // Initialize column filters and sorts
            this.data.stages.forEach((stage) => {
                this.data.columnUserFilters[stage.id] = null;
                this.data.columnSorts[stage.id] = null;
            });
            this.data.activeFilters.depth = window.WorkspaceConfig.selectedDepth ? [String(window.WorkspaceConfig.selectedDepth)] : [];
            this.data.activeFilters.language = window.WorkspaceConfig.selectedLanguage ? [String(window.WorkspaceConfig.selectedLanguage)] : [];
            this.data.activeFilters.stage = window.WorkspaceConfig.selectedStage ? [String(window.WorkspaceConfig.selectedStage)] : [];
            if (this.options.mockData && window.WorkspaceConfig.mockData) {
                this.data.cards = [...window.WorkspaceConfig.mockData.cards];
            }
        }
    }
    // Setup all event listeners
    setupEventListeners() {
        // Global search
        const searchInput = document.getElementById("globalSearch");
        const clearSearch = document.getElementById("clearSearch");
        if (searchInput) {
            searchInput.addEventListener("input", debounce((e) => {
                this.filters.handleSearch(e.target.value);
            }, 300));
        }
        if (clearSearch) {
            clearSearch.addEventListener("click", () => {
                this.filters.clearSearch();
            });
        }
        // Filter toggle
        const filterToggle = document.getElementById("filterToggle");
        if (filterToggle) {
            filterToggle.addEventListener("click", () => {
                this.filters.toggleFilters();
            });
        }
        // Close sidebar
        const closeSidebar = document.getElementById("closeSidebar");
        if (closeSidebar) {
            closeSidebar.addEventListener("click", () => {
                this.filters.toggleFilters();
            });
        }
        // Modal events
        this.modals.setupModalEvents();
        this.setupKeyboardShortcuts();
        // Window events
        window.addEventListener("resize", debounce((e) => {
            this.filters.handleResize();
        }, 250));
        document.addEventListener("typo3:color-scheme:update", () => {
            // Theme applied by TYPO3; CSS variables update automatically
        });
        // Custom events
        this.setupCustomEvents();
    }
    setupKeyboardShortcuts() {
        document.addEventListener("keydown", (e) => {
            const target = e.target;
            // Don't trigger shortcuts when typing in inputs
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
                // Allow Escape to work in inputs
                if (e.key === "Escape") {
                    target.blur();
                    this.modals.closeAllModals();
                    this.clearSelection();
                }
                return;
            }
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            // Escape key - close modals and clear selections
            if (e.key === "Escape") {
                e.preventDefault();
                this.modals.closeAllModals();
                this.clearSelection();
            }
            // Ctrl/Cmd + F - focus search
            if (isCtrlOrCmd && e.key === "f") {
                e.preventDefault();
                const searchInput = document.getElementById("globalSearch");
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            // Ctrl/Cmd + Shift + F - toggle filters
            if (isCtrlOrCmd && e.shiftKey && e.key === "F") {
                e.preventDefault();
                this.filters.toggleFilters();
            }
            // Ctrl/Cmd + Z - undo
            if (isCtrlOrCmd && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                this.undoLastAction();
            }
            // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z - redo
            if (isCtrlOrCmd && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
                e.preventDefault();
                this.redoLastAction();
            }
            // Ctrl/Cmd + R - refresh board
            if (isCtrlOrCmd && e.key === "r") {
                e.preventDefault();
                this.refresh();
                showToast("Board refreshed", "info");
            }
            // Multi-select mode toggle
            if (isCtrlOrCmd && !this.ui.isMultiSelectMode) {
                this.ui.isMultiSelectMode = true;
                document.body.classList.add("multi-select-mode");
            }
        });
        document.addEventListener("keyup", (e) => {
            // Exit multi-select mode when Ctrl/Cmd is released
            if (!e.ctrlKey && !e.metaKey && this.ui.isMultiSelectMode) {
                this.ui.isMultiSelectMode = false;
                document.body.classList.remove("multi-select-mode");
            }
        });
    }
    // Setup custom event handlers
    setupCustomEvents() {
        // Card events
        this.on("card:dragstart", (card, element) => {
            this.drag.handleCardDragStart(card, element);
        });
        this.on("card:dragend", (card, element) => {
            this.drag.handleCardDragEnd(card, element);
        });
        this.on("card:drop", (card, targetStage, sourceStage) => {
            this.drag.handleCardDrop(card, targetStage, sourceStage);
        });
        this.on("card:click", (card) => {
            if (this.ui.isMultiSelectMode) {
                this.toggleCardSelection(card.id);
            }
            else {
                this.modals.openPreviewModal(card);
            }
        });
        // Stage events
        this.on("stage:dragover", (stage, element) => {
            this.drag.handleStageDragOver(stage, element);
        });
        this.on("stage:dragleave", (stage, element) => {
            this.drag.handleStageDragLeave(stage, element);
        });
        this.on("stage:drop", (stage, element) => {
            this.drag.handleStageDrop(stage, element);
        });
        // Filter events
        this.on("filter:change", (filterType, filterValue, isActive) => {
            this.filters.handleFilterChange(filterType, filterValue, isActive);
        });
        this.on("filter:clear", () => {
            this.filters.handleFilterClear();
        });
        // Search events
        this.on("search:change", (query) => {
            this.filters.handleSearchChange(query);
        });
        this.on("search:clear", () => {
            this.filters.handleSearchClear();
        });
        // Theme events
        this.on("theme:change", (oldTheme, newTheme) => {
            this.filters.handleThemeChange(oldTheme, newTheme);
        });
    }
    // Load data from API or mock data
    loadData() {
        // If workspace is live, skip AJAX call
        if (document.querySelector('.module')?.getAttribute('data-islive') === 'true') {
            this.data.cards = [];
            this.emit("data:loaded", this.data);
            return;
        }
        if (this.options.mockData && window.WorkspaceConfig && window.WorkspaceConfig.mockData) {
            this.data.cards = [...window.WorkspaceConfig.mockData.cards];
            this.emit("data:loaded", this.data);
            return;
        }
        if (this.data.activeFilters && Object.keys(this.data.activeFilters).length > 0) {
            if (this.data.activeFilters.depth) {
                this.apiPayload.data[0].depth = this.data.activeFilters.depth.join(",");
            }
            else {
                this.apiPayload.data[0].depth = "0";
            }
            if (this.data.activeFilters.language) {
                this.apiPayload.data[0].language = this.data.activeFilters.language.join(",");
            }
            else {
                this.apiPayload.data[0].language = "all";
            }
            if (this.data.activeFilters.stage) {
                this.apiPayload.data[0].stage = this.data.activeFilters.stage.join(",");
            }
            else {
                this.apiPayload.data[0].stage = "-99";
            }
        }
        else {
            // Reset to default values when no filters are active
            this.apiPayload.data[0].depth = "0";
            this.apiPayload.data[0].language = "all";
            this.apiPayload.data[0].stage = "-99";
        }
        showLoading();
        this.api.fetchData()
            .then((data) => {
            this.data.cards = data.cards || [];
            this.emit("data:loaded", this.data);
            this.renderer.renderBoard();
        })
            .catch((error) => {
            console.error("Failed to load data:", error);
            showToast("Error loading data", "error");
            this.data.cards = [];
            this.renderer.renderBoard();
        })
            .finally(() => {
            hideLoading();
        });
    }
    // Bulk operations methods
    toggleCardSelection(cardId) {
        if (this.ui.selectedCards.has(cardId)) {
            this.ui.selectedCards.delete(cardId);
        }
        else {
            this.ui.selectedCards.add(cardId);
        }
        this.updateCardSelectionUI();
    }
    updateCardSelectionUI() {
        document.querySelectorAll(".kanban-card").forEach((cardEl) => {
            const cardId = cardEl.dataset.cardId;
            cardEl.classList.toggle("selected", this.ui.selectedCards.has(cardId));
        });
    }
    clearSelection() {
        this.ui.selectedCards.clear();
        this.ui.isMultiSelectMode = false;
        document.body.classList.remove("multi-select-mode");
        this.updateCardSelectionUI();
    }
    // Undo/Redo functionality
    addToHistory(action) {
        // Remove any actions after current index (for redo)
        this.actionHistory = this.actionHistory.slice(0, this.historyIndex + 1);
        this.actionHistory.push(action);
        this.historyIndex++;
        // Limit history size
        if (this.actionHistory.length > 50) {
            this.actionHistory.shift();
            this.historyIndex--;
        }
    }
    undoLastAction() {
        if (this.historyIndex >= 0) {
            const action = this.actionHistory[this.historyIndex];
            this.executeUndo(action);
            this.historyIndex--;
            showToast("Action undone", "info");
        }
        else {
            showToast("Nothing to undo", "warning");
        }
    }
    redoLastAction() {
        if (this.historyIndex < this.actionHistory.length - 1) {
            this.historyIndex++;
            const action = this.actionHistory[this.historyIndex];
            this.executeRedo(action);
            showToast("Action redone", "info");
        }
        else {
            showToast("Nothing to redo", "warning");
        }
    }
    executeUndo(action) {
        switch (action.type) {
            case "move":
                this.cardActions.moveCard(action.cardId, action.from, false); // false to prevent new history entry
                break;
            case "bulk_move":
                action.cardIds.forEach((cardId) => {
                    const card = this.getCardById(cardId);
                    if (card && action.originalStages && action.originalStages[cardId]) {
                        this.cardActions.moveCard(cardId, action.originalStages[cardId], false);
                    }
                });
                break;
            case "bulk_delete":
                action.deletedCardsData.forEach((cardData) => {
                    this.data.cards.push(cardData); // Re-add cards
                });
                break;
            case "bulk_assign":
                action.cardIds.forEach((cardId) => {
                    const card = this.getCardById(cardId);
                    if (card && action.originalAssignments && action.originalAssignments[cardId]) {
                        card.assignedUsers = action.originalAssignments[cardId];
                    }
                });
                break;
        }
        this.renderer.renderBoard();
    }
    executeRedo(action) {
        switch (action.type) {
            case "move":
                this.cardActions.moveCard(action.cardId, action.to, false); // false to prevent new history entry
                break;
            case "bulk_move":
                action.cardIds.forEach((cardId) => {
                    this.cardActions.moveCard(cardId, action.targetStage, false);
                });
                break;
            case "bulk_delete":
                action.cardIds.forEach((cardId) => {
                    this.data.cards = this.data.cards.filter((card) => card.id !== cardId); // Re-delete cards
                });
                break;
            case "bulk_assign":
                action.cardIds.forEach((cardId) => {
                    const card = this.getCardById(cardId);
                    if (card) {
                        card.assignedUsers = Array.from(new Set([...(card.assignedUsers || []), ...action.users]));
                    }
                });
                break;
        }
        this.renderer.renderBoard();
    }
    // Utility methods
    getCardById(cardId) {
        // Handle both string and number cardId (dataset returns strings)
        return this.data.cards.find((card) => card.id == cardId || card.id === cardId);
    }
    getStageById(stageId) {
        // Handle both string and number stageId (dataset returns strings)
        return this.data.stages.find((stage) => stage.id == stageId || stage.id === stageId);
    }
    getUserById(userId) {
        if (window.WorkspaceConfig && window.WorkspaceConfig.users) {
            return window.WorkspaceConfig.users.find((user) => user.id === userId);
        }
        return null;
    }
    getCardComments(cardId) {
        if (this.data && this.data.comments) {
            const comments = this.data.comments[cardId];
            if (comments)
                return comments;
        }
        return [];
    }
    getCardHistory(cardId) {
        if (this.data && this.data.history) {
            const history = this.data.history[cardId];
            if (history)
                return history;
        }
        return [];
    }
    // Public API methods
    on(event, callback) {
        return this.events.on(event, callback);
    }
    off(event, callback) {
        return this.events.off(event, callback);
    }
    emit(event, ...args) {
        return this.events.emit(event, ...args);
    }
    refresh() {
        this.loadData();
    }
    destroy() {
        this.events.events = {};
        window.removeEventListener("resize", this.handleResize);
        if (this.container) {
            this.container.innerHTML = "";
        }
        this.emit("board:destroyed", this);
    }
}
