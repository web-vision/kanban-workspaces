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
import { html, nothing, render, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Notification from '@typo3/backend/notification.js';
import Modal from '@typo3/backend/modal.js';
import { SeverityEnum } from '@typo3/backend/enum/severity.js';
import DeferredAction from '@typo3/backend/action-button/deferred-action.js';
import { WorkspaceApi } from '@web-vision/kanban-workspaces/data/WorkspaceApi.js';
import { showToast, showLoading, hideLoading, debounce } from '@web-vision/kanban-workspaces/core/utils.js';
import { initHorizontalScroll } from '@web-vision/kanban-workspaces/core/HorizontalScroll.js';
import '@web-vision/kanban-workspaces/components/column.js';
import '@web-vision/kanban-workspaces/components/filter-bar.js';
import '@web-vision/kanban-workspaces/components/preview-modal.js';
import '@web-vision/kanban-workspaces/components/send-to-stage-modal.js';
import '@web-vision/kanban-workspaces/components/assign-modal.js';
/**
 * Root Kanban board component. Owns the reactive state (cards, stages, filters,
 * selection, modal state), loads data through {@link WorkspaceApi} and
 * coordinates the child components (columns, the inline filter bar and the
 * three modals). Renders into light DOM so the extension's global CSS applies.
 */
let KanbanBoardElement = class KanbanBoardElement extends LitElement {
    constructor() {
        super(...arguments);
        this.cards = [];
        this.stages = [];
        this.filters = {};
        this.activeFilters = {};
        this.searchQuery = '';
        this.selectedCards = new Set();
        // Preview modal state
        this.previewOpen = false;
        this.previewCard = null;
        this.previewLoading = false;
        this.commentPending = false;
        // Send-to-stage modal state
        this.sendOpen = false;
        this.sendFormData = null;
        this.sendContext = null;
        this.sendPending = false;
        // Assign modal state
        this.assignOpen = false;
        this.assignCard = null;
        // Card context menu state
        this.contextMenu = null;
        this.columnUserFilters = {};
        this.columnSorts = {};
        this.comments = {};
        this.history = {};
        this.diffs = {};
        this.beUsers = [];
        this.multiSelectMode = false;
        this.draggedCard = null;
        this.mockData = false;
        this.boundKeyDown = (e) => this.onKeyDown(e);
        this.boundKeyUp = (e) => this.onKeyUp(e);
        this.boundContextClose = (e) => {
            // Ignore presses inside the menu so the item's click handler can run;
            // only an outside press closes it.
            const menu = this.querySelector('.context-menu');
            if (menu && menu.contains(e.target)) {
                return;
            }
            this.closeContextMenu();
        };
        this.headerSearch = null;
        this.headerClearSearch = null;
        // The inline filter bar lives in the Fluid-rendered board toolbar
        // (`.workspace-header`), outside this component's render root.
        this.filterBarRoot = null;
        // The modals are portalled to <body> so they escape `.workspace-main`
        // (which sets `user-select: none` and is a scroll container).
        this.modalRoot = null;
    }
    createRenderRoot() {
        return this;
    }
    connectedCallback() {
        super.connectedCallback();
        this.loadConfiguration();
        const dataUrl = TYPO3?.settings?.ajaxUrls?.workspace_dispatch || '/typo3/ajax/workspace';
        const processUrl = TYPO3?.settings?.ajaxUrls?.usersettings_process || '/typo3/ajax/process';
        this.api = new WorkspaceApi(dataUrl, processUrl);
        this.apiPayload = {
            action: 'RemoteServer',
            method: 'getWorkspaceInfos',
            data: [{
                    id: parseInt(new URL(window.location.href).searchParams.get('id') || '0', 10),
                    depth: '0', language: 'all', limit: 30, query: '', start: 0, filterTxt: '', stage: '-99',
                }],
        };
        this.wireHeaderControls();
        this.modalRoot = document.createElement('div');
        this.modalRoot.className = 'typo3-kanban-modal-root';
        document.body.appendChild(this.modalRoot);
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        this.loadData();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        document.removeEventListener('mousedown', this.boundContextClose, true);
        this.modalRoot?.remove();
        this.modalRoot = null;
        if (this.filterBarRoot) {
            render(nothing, this.filterBarRoot);
            this.filterBarRoot = null;
        }
    }
    firstUpdated() {
        initHorizontalScroll();
    }
    updated() {
        // Keep the portalled modals and the header filter bar in sync with the
        // board state.
        if (this.modalRoot) {
            render(this.renderModals(), this.modalRoot);
        }
        if (this.filterBarRoot) {
            render(this.renderFilterBar(), this.filterBarRoot);
        }
    }
    loadConfiguration() {
        const config = window.WorkspaceConfig;
        if (!config) {
            return;
        }
        this.stages = [...(config.stages || [])];
        this.filters = { ...(config.filters || {}) };
        this.beUsers = config.beUsers || [];
        this.stages.forEach((stage) => {
            this.columnUserFilters[stage.id] = null;
            this.columnSorts[stage.id] = null;
        });
        this.activeFilters = {
            depth: config.selectedDepth ? [String(config.selectedDepth)] : [],
            language: config.selectedLanguage ? [String(config.selectedLanguage)] : [],
            stage: config.selectedStage ? [String(config.selectedStage)] : [],
        };
        this.mockData = !!config.mockData;
    }
    wireHeaderControls() {
        this.headerSearch = document.getElementById('globalSearch');
        this.headerClearSearch = document.getElementById('clearSearch');
        this.filterBarRoot = document.getElementById('headerFilters');
        this.headerSearch?.addEventListener('input', debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));
        this.headerClearSearch?.addEventListener('click', () => {
            if (this.headerSearch) {
                this.headerSearch.value = '';
            }
            this.handleSearch('');
        });
        document.getElementById('clearAllFilters')?.addEventListener('click', () => this.handleFilterClear());
    }
    // --- Data ------------------------------------------------------------------
    loadData() {
        if (document.querySelector('[data-islive="true"]')) {
            this.cards = [];
            return;
        }
        if (this.mockData && window.WorkspaceConfig?.mockData) {
            this.cards = [...window.WorkspaceConfig.mockData.cards];
            return;
        }
        const payload = this.apiPayload.data[0];
        payload.depth = this.activeFilters.depth?.length ? this.activeFilters.depth.join(',') : '0';
        payload.language = this.activeFilters.language?.length ? this.activeFilters.language.join(',') : 'all';
        payload.stage = this.activeFilters.stage?.length ? this.activeFilters.stage.join(',') : '-99';
        payload.filterTxt = this.searchQuery;
        showLoading();
        this.api.fetchData(this.apiPayload)
            .then((data) => { this.cards = data.cards || []; })
            .catch((error) => { console.error('Failed to load data:', error); showToast('Error loading data', 'error'); this.cards = []; })
            .finally(() => hideLoading());
    }
    cardsForStage(stage) {
        let list = this.cards.filter((card) => card.stage === stage.id);
        const userFilter = this.columnUserFilters[stage.id];
        if (userFilter) {
            list = list.filter((card) => (card.assignedUsers || []).some((u) => u.uid === userFilter));
        }
        if (this.columnSorts[stage.id] === 'modifiedDate') {
            list = [...list].sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime());
        }
        return list;
    }
    getCardById(id) {
        return this.cards.find((card) => card.id == id);
    }
    // --- Selection / keyboard --------------------------------------------------
    clearSelection() {
        this.selectedCards = new Set();
        this.multiSelectMode = false;
        document.body.classList.remove('multi-select-mode');
    }
    onKeyDown(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                target.blur();
                this.closeAllModals();
                this.clearSelection();
            }
            return;
        }
        const ctrl = e.ctrlKey || e.metaKey;
        if (e.key === 'Escape') {
            this.closeAllModals();
            this.clearSelection();
        }
        if (ctrl && e.key === 'f') {
            e.preventDefault();
            this.headerSearch?.focus();
            this.headerSearch?.select();
        }
        if (ctrl && e.key === 'r') {
            e.preventDefault();
            this.loadData();
            showToast('Board refreshed', 'info');
        }
        if (ctrl && !this.multiSelectMode) {
            this.multiSelectMode = true;
            document.body.classList.add('multi-select-mode');
        }
    }
    onKeyUp(e) {
        if (!e.ctrlKey && !e.metaKey && this.multiSelectMode) {
            this.multiSelectMode = false;
            document.body.classList.remove('multi-select-mode');
        }
    }
    // --- Filters / search ------------------------------------------------------
    handleSearch(query) {
        this.searchQuery = query;
        if (this.headerClearSearch) {
            this.headerClearSearch.style.display = query ? 'block' : 'none';
        }
        this.apiPayload.data[0].filterTxt = query;
        this.loadData();
    }
    handleFilterChange(filterType, value, active, single) {
        const current = { ...this.activeFilters };
        if (single) {
            current[filterType] = [value];
        }
        else {
            const list = new Set(current[filterType] || []);
            if (active) {
                list.add(value);
            }
            else {
                list.delete(value);
            }
            current[filterType] = Array.from(list);
            if (current[filterType].length === 0) {
                delete current[filterType];
            }
        }
        this.activeFilters = current;
        this.api.processData('set', filterType, value);
        this.loadData();
    }
    handleFilterClear() {
        this.activeFilters = {};
        this.api.processData('clear', 'depth', '0');
        this.api.processData('clear', 'language', 'all');
        this.api.processData('clear', 'stage', '-99');
        this.loadData();
    }
    // --- Modals: preview -------------------------------------------------------
    openPreviewModal(card) {
        this.previewCard = card;
        this.previewOpen = true;
        this.previewLoading = true;
        this.modalRoot?.querySelector('typo3-kanban-preview-modal')?.resetTab?.();
        document.body.style.overflow = 'hidden';
        this.api.fetchCardDetails(card)
            .then((details) => {
            this.comments[card.id] = details.comments;
            this.history[card.id] = details.history;
            this.diffs[card.id] = details.diff;
        })
            .catch((error) => console.error('Failed to load card details:', error))
            .finally(() => { this.previewLoading = false; this.requestUpdate(); });
    }
    closePreviewModal() {
        this.previewOpen = false;
        document.body.style.overflow = '';
    }
    closeAllModals() {
        this.previewOpen = false;
        this.assignOpen = false;
        this.sendOpen = false;
        document.body.style.overflow = '';
    }
    handleAddComment(text) {
        const card = this.previewCard;
        if (!card) {
            return;
        }
        this.commentPending = true;
        this.api.dispatch({
            action: 'Actions', method: 'sendToSpecificStageExecute',
            data: [{ comments: text, affects: { elements: [{ table: card.table, uid: card.uid, t3ver_oid: card.t3ver_oid }], nextStage: card.stage } }],
        }).then((result) => {
            if (result && result.success !== false) {
                const textarea = this.modalRoot?.querySelector('#newComment');
                if (textarea) {
                    textarea.value = '';
                }
                showToast('Comment added', 'success');
                return this.api.fetchCardDetails(card).then((details) => {
                    this.comments[card.id] = details.comments;
                    this.history[card.id] = details.history;
                    this.diffs[card.id] = details.diff;
                    this.requestUpdate();
                });
            }
            throw new Error((result && result.message) || 'Failed to add comment');
        }).catch((error) => { console.error(error); showToast('Failed to add comment', 'error'); })
            .finally(() => { this.commentPending = false; });
    }
    // --- Stage transitions -----------------------------------------------------
    stageIndex(stageId) {
        return this.stages.findIndex((s) => s.id == stageId);
    }
    async openStageWindow(card, direction, cardIds, targetStage) {
        const method = direction === 'next' ? 'sendToNextStageWindow' : 'sendToPrevStageWindow';
        const executeMethod = direction === 'next' ? 'sendToNextStageExecute' : 'sendToPrevStageExecute';
        const data = direction === 'next' ? [card.uid, card.table, card.t3ver_oid] : [card.uid, card.table];
        try {
            const response = await this.api.dispatch({ action: 'Actions', method, data });
            const formData = response?.[0]?.result;
            if (!formData || formData.success === false) {
                throw new Error('Invalid stage form response');
            }
            this.sendFormData = formData;
            this.sendContext = {
                url: '', executeMethod, cardIds, targetStage,
                isDragDrop: false,
            };
            this.sendOpen = true;
            document.body.style.overflow = 'hidden';
        }
        catch (error) {
            console.error(error);
            showToast('Failed to load stage form', 'error');
        }
    }
    /**
     * Open the send-to-stage modal for a drag-drop onto an arbitrary column.
     * Uses sendToSpecificStageWindow/Execute so cards can jump directly to the
     * dropped column instead of only advancing one stage at a time.
     */
    async openSpecificStageWindow(targetStage, cardIds, sourceStage) {
        try {
            const response = await this.api.dispatch({
                action: 'Actions',
                method: 'sendToSpecificStageWindow',
                data: [Number(targetStage.id)],
            });
            const formData = response?.[0]?.result;
            if (!formData || formData.success === false) {
                throw new Error('Invalid stage form response');
            }
            this.sendFormData = formData;
            this.sendContext = {
                url: '',
                executeMethod: 'sendToSpecificStageExecute',
                cardIds,
                targetStage,
                sourceStage,
                isDragDrop: true,
            };
            this.sendOpen = true;
            document.body.style.overflow = 'hidden';
        }
        catch (error) {
            console.error(error);
            showToast('Failed to load stage form', 'error');
        }
    }
    handleRevertStage() {
        const card = this.previewCard;
        if (!card) {
            return;
        }
        const target = this.stages[this.stageIndex(card.stage) - 1] || null;
        this.openStageWindow(card, 'prev', [card.id], target);
    }
    handleNextStage() {
        const card = this.previewCard;
        if (!card) {
            return;
        }
        const idx = this.stageIndex(card.stage);
        const target = idx >= 0 && idx < this.stages.length - 1 ? this.stages[idx + 1] : null;
        this.openStageWindow(card, 'next', [card.id], target);
    }
    handleColumnDrop(stageId, cardId) {
        const dragged = this.getCardById(cardId);
        if (!dragged) {
            return;
        }
        const targetStage = this.stages.find((s) => s.id == stageId);
        const sourceStage = this.stages.find((s) => s.id == dragged.stage);
        if (!targetStage || !sourceStage || targetStage.id == sourceStage.id) {
            return;
        }
        // Only forward cards not already in the drop target: a multi-selection may
        // span stages or include cards already sitting in the target column.
        const cardIds = (this.selectedCards.size > 0 ? Array.from(this.selectedCards) : [cardId])
            .filter((id) => {
            const card = this.getCardById(id);
            return card != null && card.stage != targetStage.id;
        });
        if (cardIds.length === 0) {
            return;
        }
        this.openSpecificStageWindow(targetStage, cardIds, sourceStage);
    }
    async handleSendSubmit(comments, additional, recipients) {
        if (!this.sendContext || !this.sendFormData) {
            return;
        }
        const { executeMethod, cardIds, targetStage } = this.sendContext;
        this.sendPending = true;
        try {
            // sendToSpecificStageExecute needs nextStage + all selected elements;
            // adjacent next/prev window responses already carry the correct affects.
            let affects = this.sendFormData.affects;
            if (executeMethod === 'sendToSpecificStageExecute') {
                const elements = cardIds
                    .map((id) => this.getCardById(id))
                    .filter(Boolean)
                    .map((card) => ({
                    table: card.table,
                    uid: card.uid,
                    t3ver_oid: card.t3ver_oid,
                }));
                affects = {
                    elements,
                    nextStage: targetStage?.id ?? this.sendFormData.affects?.nextStage,
                };
            }
            const result = await this.api.dispatch({
                action: 'Actions', method: executeMethod,
                data: [{ comments, recipients, additional, affects }],
            });
            if (result?.[0]?.result?.success === false) {
                throw new Error(result[0].result.message || 'Stage transition failed');
            }
            if (targetStage) {
                this.moveCards(cardIds, targetStage.id);
                Notification.success(TYPO3?.lang?.actionSendToStage || 'Send to stage', `Content moved to ${targetStage.label} and notifications sent`);
            }
            else {
                this.loadData();
                showToast('Action completed successfully', 'success');
            }
            this.sendOpen = false;
            this.previewOpen = false;
            this.sendContext = null;
            document.body.style.overflow = '';
        }
        catch (error) {
            showToast('Failed to execute: ' + (error?.message || error), 'error');
        }
        finally {
            this.sendPending = false;
        }
    }
    handleSendCancel() {
        this.sendOpen = false;
        this.sendContext = null;
        document.body.style.overflow = this.previewOpen ? 'hidden' : '';
    }
    moveCards(cardIds, targetStageId) {
        const ids = new Set(cardIds.map(String));
        this.cards = this.cards.map((card) => ids.has(String(card.id)) ? { ...card, stage: targetStageId } : card);
        this.clearSelection();
    }
    // --- Card context menu / actions ------------------------------------------
    openContextMenu(card, anchor) {
        const rect = anchor.getBoundingClientRect();
        this.contextMenu = { card, x: rect.left, y: rect.bottom };
        setTimeout(() => document.addEventListener('mousedown', this.boundContextClose, true), 0);
    }
    closeContextMenu() {
        if (this.contextMenu) {
            this.contextMenu = null;
            document.removeEventListener('mousedown', this.boundContextClose, true);
        }
    }
    runCardAction(action, card) {
        this.closeContextMenu();
        switch (action) {
            case 'preview-element':
                this.previewElement(card);
                break;
            case 'edit-element':
                this.editCard(card);
                break;
            case 'page-version':
                this.pageVersion(card);
                break;
            case 'assign-record':
                this.openAssignModal(card);
                break;
            case 'delete-card':
                this.deleteCard(card);
                break;
        }
    }
    previewElement(card) {
        this.api.dispatch({ action: 'Actions', method: 'viewSingleRecord', data: [card.table, card.uid] })
            .then((response) => {
            const url = response?.[0]?.result;
            if (url) {
                window.open(url, 'newTYPO3frontendWindow')?.focus();
            }
        })
            .catch((error) => { console.error(error); showToast('Failed to open preview', 'error'); });
    }
    editCard(card) {
        const base = TYPO3.settings.FormEngine.moduleUrl;
        window.location.href = `${base}&returnUrl=${encodeURIComponent(window.location.href)}&id=${TYPO3.settings.Workspaces.id}&edit[${card.table}][${card.uid}]=edit`;
    }
    pageVersion(card) {
        const recordUid = card.table === 'pages' ? card.t3ver_oid : card.pid;
        window.location.href = `${TYPO3.settings.WebLayout.moduleUrl}&id=${recordUid}`;
    }
    openAssignModal(card) {
        if (!TYPO3?.settings?.ajaxUrls?.kanban_workspace_assign) {
            Notification.error('Assign', 'Assign URL not configured', 5);
            return;
        }
        this.assignCard = card;
        this.assignOpen = true;
        document.body.style.overflow = 'hidden';
    }
    handleAssignSubmit(title, description, beUser) {
        const card = this.assignCard;
        if (!card) {
            return;
        }
        const url = TYPO3.settings.ajaxUrls.kanban_workspace_assign;
        const workspaceId = card.t3ver_wsid || TYPO3.settings.Workspaces.id;
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                data: [{
                        table: card.table, record_uid: parseInt(String(card.uid), 10), workspace_id: workspaceId,
                        stage_id: parseInt(String(card.stage), 10) || 0, be_user: beUser, title, description,
                    }],
            }),
        }).then((r) => r.json()).then((result) => {
            if (result && result.success !== false) {
                this.assignOpen = false;
                document.body.style.overflow = '';
                Notification.success('Assign', 'Assignment saved', 2);
                this.loadData();
            }
            else {
                throw new Error((result && result.message) || 'Assignment failed');
            }
        }).catch((error) => { Notification.error('Assign', error?.message || 'Assignment failed', 5); this.assignOpen = false; document.body.style.overflow = ''; });
    }
    deleteCard(card) {
        const deleteAction = new DeferredAction(() => {
            return this.api.dispatch({ action: 'Actions', method: 'deleteSingleRecord', data: [card.table, card.uid] })
                .then(() => { this.loadData(); showToast('Card deleted successfully', 'success'); })
                .catch((error) => { showToast('Failed to delete card', 'error'); throw error; });
        });
        Modal.advanced({
            title: 'Discard version of record',
            content: 'Do you really want to discard this version of the record?',
            severity: SeverityEnum.error,
            buttons: [
                { text: 'Cancel', btnClass: 'btn-default', trigger: () => Modal.dismiss() },
                { text: 'Discard version', btnClass: 'btn-danger', action: deleteAction },
            ],
        });
    }
    // --- Card interaction ------------------------------------------------------
    handleCardClick(card) {
        if (this.multiSelectMode) {
            const next = new Set(this.selectedCards);
            if (next.has(card.id)) {
                next.delete(card.id);
            }
            else {
                next.add(card.id);
            }
            this.selectedCards = next;
        }
        else {
            this.openPreviewModal(card);
        }
    }
    // --- Render ----------------------------------------------------------------
    renderContextMenu() {
        if (!this.contextMenu) {
            return nothing;
        }
        const { card, x, y } = this.contextMenu;
        const items = [
            { action: 'preview-element', label: 'Preview Element', cls: '' },
            { action: 'edit-element', label: 'Edit Element', cls: '' },
            { action: 'page-version', label: 'Open version of page', cls: '' },
            { action: 'assign-record', label: 'Assign', cls: '' },
            { action: 'delete-card', label: 'Discard version of record', cls: 'danger' },
        ];
        return html `
      <div class="context-menu card-context-menu" style=${`position: fixed; left: ${x}px; top: ${y}px; z-index: 9999;`}
        @mousedown=${(e) => e.stopPropagation()}>
        <div class="context-menu-header">Card Actions</div>
        ${items.map((item) => html `
          <div class="context-menu-item ${item.cls}" @click=${() => this.runCardAction(item.action, card)}>${item.label}</div>`)}
      </div>`;
    }
    renderFilterBar() {
        return html `
      <typo3-kanban-filter-bar
        .filters=${this.filters}
        .activeFilters=${this.activeFilters}
        @filter-change=${(e) => this.handleFilterChange(e.detail.filterType, e.detail.value, e.detail.active, !!e.detail.single)}
        @filter-clear=${() => this.handleFilterClear()}></typo3-kanban-filter-bar>`;
    }
    render() {
        const sortedStages = [...this.stages].sort((a, b) => (a.order || 0) - (b.order || 0));
        return html `
      <section class="kanban-container">
        <div class="kanban-board" id="kanbanBoard"
          @card-click=${(e) => this.handleCardClick(e.detail.card)}
          @card-menu=${(e) => this.openContextMenu(e.detail.card, e.detail.anchor)}
          @card-dragstart=${(e) => { this.draggedCard = e.detail.card; document.body.classList.add('dragging'); }}
          @card-dragend=${() => { this.draggedCard = null; document.body.classList.remove('dragging'); }}
          @column-drop=${(e) => this.handleColumnDrop(e.detail.stageId, e.detail.cardId)}>
          ${sortedStages.map((stage) => html `
            <typo3-kanban-column
              .stage=${stage}
              .cards=${this.cardsForStage(stage)}
              .selectedCards=${this.selectedCards}></typo3-kanban-column>`)}
        </div>
      </section>

      ${this.renderContextMenu()}`;
    }
    renderModals() {
        return html `
      <typo3-kanban-preview-modal
        ?open=${this.previewOpen}
        .card=${this.previewCard}
        .stages=${this.stages}
        .comments=${this.previewCard ? (this.comments[this.previewCard.id] || []) : []}
        .history=${this.previewCard ? (this.history[this.previewCard.id] || []) : []}
        .diffs=${this.previewCard ? (this.diffs[this.previewCard.id] || []) : []}
        ?loading=${this.previewLoading}
        ?commentPending=${this.commentPending}
        @preview-close=${() => this.closePreviewModal()}
        @preview-add-comment=${(e) => this.handleAddComment(e.detail.text)}
        @preview-revert=${() => this.handleRevertStage()}
        @preview-next=${() => this.handleNextStage()}
        @toast=${(e) => showToast(e.detail.message, e.detail.type)}></typo3-kanban-preview-modal>

      <typo3-kanban-send-to-stage-modal
        ?open=${this.sendOpen}
        .formData=${this.sendFormData}
        .context=${this.sendContext}
        ?pending=${this.sendPending}
        @send-submit=${(e) => this.handleSendSubmit(e.detail.comments, e.detail.additional, e.detail.recipients)}
        @send-cancel=${() => this.handleSendCancel()}></typo3-kanban-send-to-stage-modal>

      <typo3-kanban-assign-modal
        ?open=${this.assignOpen}
        .card=${this.assignCard}
        .beUsers=${this.beUsers}
        @assign-submit=${(e) => this.handleAssignSubmit(e.detail.title, e.detail.description, e.detail.be_user)}
        @assign-cancel=${() => { this.assignOpen = false; document.body.style.overflow = ''; }}
        @toast=${(e) => showToast(e.detail.message, e.detail.type)}></typo3-kanban-assign-modal>`;
    }
};
__decorate([
    state()
], KanbanBoardElement.prototype, "cards", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "stages", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "filters", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "activeFilters", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "searchQuery", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "selectedCards", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "previewOpen", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "previewCard", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "previewLoading", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "commentPending", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "sendOpen", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "sendFormData", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "sendContext", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "sendPending", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "assignOpen", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "assignCard", void 0);
__decorate([
    state()
], KanbanBoardElement.prototype, "contextMenu", void 0);
KanbanBoardElement = __decorate([
    customElement('typo3-kanban-board')
], KanbanBoardElement);
export { KanbanBoardElement };
