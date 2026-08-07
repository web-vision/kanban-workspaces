import { html, nothing, render, LitElement, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Notification from '@typo3/backend/notification.js';
import Modal from '@typo3/backend/modal.js';
import { SeverityEnum } from '@typo3/backend/enum/severity.js';
import DeferredAction from '@typo3/backend/action-button/deferred-action.js';
import Utility from '@typo3/backend/utility.js';
import { WorkspaceApi } from '@web-vision/kanban-workspaces/data/WorkspaceApi.js';
import { showToast, showLoading, hideLoading, debounce } from '@web-vision/kanban-workspaces/core/utils.js';
import { initHorizontalScroll } from '@web-vision/kanban-workspaces/core/HorizontalScroll.js';
import '@web-vision/kanban-workspaces/components/column.js';
import '@web-vision/kanban-workspaces/components/filter-bar.js';
import '@web-vision/kanban-workspaces/components/preview-modal.js';
import '@web-vision/kanban-workspaces/components/send-to-stage-modal.js';
import '@web-vision/kanban-workspaces/components/assign-modal.js';
import type { SendToStageContext } from '@web-vision/kanban-workspaces/components/send-to-stage-modal.js';
import type { Card, Stage, FilterConfig, CardUser } from '@web-vision/kanban-workspaces/types.js';

declare const TYPO3: any;

/**
 * Root Kanban board component. Owns the reactive state (cards, stages, filters,
 * selection, modal state), loads data through {@link WorkspaceApi} and
 * coordinates the child components (columns, the inline filter bar and the
 * three modals). Renders into light DOM so the extension's global CSS applies.
 */
@customElement('typo3-kanban-board')
export class KanbanBoardElement extends LitElement {
  @state() private cards: Card[] = [];
  @state() private stages: Stage[] = [];
  @state() private filters: Record<string, FilterConfig> = {};
  @state() private activeFilters: Record<string, string[]> = {};
  @state() private searchQuery = '';
  @state() private selectedCards = new Set<string | number>();

  // Preview modal state
  @state() private previewOpen = false;
  @state() private previewCard: Card | null = null;
  @state() private previewLoading = false;
  @state() private commentPending = false;

  // Send-to-stage modal state
  @state() private sendOpen = false;
  @state() private sendFormData: any = null;
  @state() private sendContext: SendToStageContext | null = null;
  @state() private sendPending = false;

  // Assign modal state
  @state() private assignOpen = false;
  @state() private assignCard: Card | null = null;

  // Card context menu state
  @state() private contextMenu: { card: Card; x: number; y: number } | null = null;

  private columnUserFilters: Record<string, string | null> = {};
  private columnSorts: Record<string, string | null> = {};
  private comments: Record<string, any[]> = {};
  private history: Record<string, any[]> = {};
  private diffs: Record<string, any[]> = {};
  private beUsers: CardUser[] = [];
  private multiSelectMode = false;
  private draggedCard: Card | null = null;

  private api!: WorkspaceApi;
  private apiPayload: any;
  private mockData = false;

  private readonly boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
  private readonly boundKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);
  private readonly boundContextClose = (e: MouseEvent) => {
    // Ignore presses inside the menu so the item's click handler can run;
    // only an outside press closes it.
    const menu = this.querySelector('.context-menu');
    if (menu && menu.contains(e.target as Node)) {
      return;
    }
    this.closeContextMenu();
  };
  private headerSearch: HTMLInputElement | null = null;
  private headerClearSearch: HTMLElement | null = null;
  // The inline filter bar lives in the Fluid-rendered board toolbar
  // (`.workspace-header`), outside this component's render root.
  private filterBarRoot: HTMLElement | null = null;
  // The modals are portalled to <body> so they escape `.workspace-main`
  // (which sets `user-select: none` and is a scroll container).
  private modalRoot: HTMLElement | null = null;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  public override connectedCallback(): void {
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

  public override disconnectedCallback(): void {
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

  protected override firstUpdated(): void {
    initHorizontalScroll();
  }

  protected override updated(): void {
    // Keep the portalled modals and the header filter bar in sync with the
    // board state.
    if (this.modalRoot) {
      render(this.renderModals(), this.modalRoot);
    }
    if (this.filterBarRoot) {
      render(this.renderFilterBar(), this.filterBarRoot);
    }
  }

  private loadConfiguration(): void {
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

  private wireHeaderControls(): void {
    this.headerSearch = document.getElementById('globalSearch') as HTMLInputElement | null;
    this.headerClearSearch = document.getElementById('clearSearch');
    this.filterBarRoot = document.getElementById('headerFilters');
    this.headerSearch?.addEventListener('input', debounce((e: Event) => {
      this.handleSearch((e.target as HTMLInputElement).value);
    }, 300));
    this.headerClearSearch?.addEventListener('click', () => {
      if (this.headerSearch) { this.headerSearch.value = ''; }
      this.handleSearch('');
    });
    document.getElementById('clearAllFilters')?.addEventListener('click', () => this.handleFilterClear());
  }

  // --- Data ------------------------------------------------------------------

  private loadData(): void {
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

  private cardsForStage(stage: Stage): Card[] {
    let list = this.cards.filter((card) => card.stage === stage.id);
    const userFilter = this.columnUserFilters[stage.id];
    if (userFilter) {
      list = list.filter((card) => (card.assignedUsers || []).some((u) => u.uid === userFilter));
    }
    if (this.columnSorts[stage.id] === 'modifiedDate') {
      list = [...list].sort((a, b) => new Date(b.modifiedDate as string).getTime() - new Date(a.modifiedDate as string).getTime());
    }
    return list;
  }

  private getCardById(id: string | number): Card | undefined {
    return this.cards.find((card) => card.id == id);
  }

  // --- Selection / keyboard --------------------------------------------------

  private clearSelection(): void {
    this.selectedCards = new Set();
    this.multiSelectMode = false;
    document.body.classList.remove('multi-select-mode');
  }

  private onKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') { target.blur(); this.closeAllModals(); this.clearSelection(); }
      return;
    }
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') { this.closeAllModals(); this.clearSelection(); }
    if (ctrl && e.key === 'f') { e.preventDefault(); this.headerSearch?.focus(); this.headerSearch?.select(); }
    if (ctrl && e.key === 'r') { e.preventDefault(); this.loadData(); showToast('Board refreshed', 'info'); }
    if (ctrl && !this.multiSelectMode) { this.multiSelectMode = true; document.body.classList.add('multi-select-mode'); }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!e.ctrlKey && !e.metaKey && this.multiSelectMode) {
      this.multiSelectMode = false;
      document.body.classList.remove('multi-select-mode');
    }
  }

  // --- Filters / search ------------------------------------------------------

  private handleSearch(query: string): void {
    this.searchQuery = query;
    if (this.headerClearSearch) { this.headerClearSearch.style.display = query ? 'block' : 'none'; }
    this.apiPayload.data[0].filterTxt = query;
    this.loadData();
  }

  private handleFilterChange(filterType: string, value: string, active: boolean, single: boolean): void {
    const current = { ...this.activeFilters };
    if (single) {
      current[filterType] = [value];
    } else {
      const list = new Set(current[filterType] || []);
      if (active) { list.add(value); } else { list.delete(value); }
      current[filterType] = Array.from(list);
      if (current[filterType].length === 0) { delete current[filterType]; }
    }
    this.activeFilters = current;
    this.api.processData('set', filterType, value);
    this.loadData();
  }

  private handleFilterClear(): void {
    this.activeFilters = {};
    this.api.processData('clear', 'depth', '0');
    this.api.processData('clear', 'language', 'all');
    this.api.processData('clear', 'stage', '-99');
    this.loadData();
  }

  // --- Modals: preview -------------------------------------------------------

  private openPreviewModal(card: Card): void {
    this.previewCard = card;
    this.previewOpen = true;
    this.previewLoading = true;
    (this.modalRoot?.querySelector('typo3-kanban-preview-modal') as any)?.resetTab?.();
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

  private closePreviewModal(): void {
    this.previewOpen = false;
    document.body.style.overflow = '';
  }

  private closeAllModals(): void {
    this.previewOpen = false;
    this.assignOpen = false;
    this.sendOpen = false;
    document.body.style.overflow = '';
  }

  private handleAddComment(text: string): void {
    const card = this.previewCard;
    if (!card) { return; }
    this.commentPending = true;
    this.api.dispatch({
      action: 'Actions', method: 'sendToSpecificStageExecute',
      data: [{ comments: text, affects: { elements: [{ table: card.table, uid: card.uid, t3ver_oid: card.t3ver_oid }], nextStage: card.stage } }],
    }).then((result) => {
      if (result && result.success !== false) {
        const textarea = this.modalRoot?.querySelector<HTMLTextAreaElement>('#newComment');
        if (textarea) { textarea.value = ''; }
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

  private stageIndex(stageId: string | number): number {
    return this.stages.findIndex((s) => s.id == stageId);
  }

  private async openStageWindow(card: Card, direction: 'next' | 'prev', cardIds: (string | number)[], targetStage: Stage | null): Promise<void> {
    const method = direction === 'next' ? 'sendToNextStageWindow' : 'sendToPrevStageWindow';
    const executeMethod = direction === 'next' ? 'sendToNextStageExecute' : 'sendToPrevStageExecute';
    const data = direction === 'next' ? [card.uid, card.table, card.t3ver_oid] : [card.uid, card.table];
    try {
      const response = await this.api.dispatch({ action: 'Actions', method, data });
      const formData = response?.[0]?.result;
      if (!formData || formData.success === false) { throw new Error('Invalid stage form response'); }
      this.sendFormData = formData;
      this.sendContext = {
        url: '', executeMethod, cardIds, targetStage,
        isDragDrop: false,
      };
      this.sendOpen = true;
      document.body.style.overflow = 'hidden';
    } catch (error) {
      console.error(error);
      showToast('Failed to load stage form', 'error');
    }
  }

  /**
   * Open the send-to-stage modal for a drag-drop onto an arbitrary column.
   * Uses sendToSpecificStageWindow/Execute so cards can jump directly to the
   * dropped column instead of only advancing one stage at a time.
   */
  private async openSpecificStageWindow(
    targetStage: Stage,
    cardIds: (string | number)[],
    sourceStage: Stage | null,
  ): Promise<void> {
    try {
      const response = await this.api.dispatch({
        action: 'Actions',
        method: 'sendToSpecificStageWindow',
        data: [Number(targetStage.id)],
      });
      const formData = response?.[0]?.result;
      if (!formData || formData.success === false) { throw new Error('Invalid stage form response'); }
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
    } catch (error) {
      console.error(error);
      showToast('Failed to load stage form', 'error');
    }
  }

  private handleRevertStage(): void {
    const card = this.previewCard;
    if (!card) { return; }
    const target = this.stages[this.stageIndex(card.stage) - 1] || null;
    this.openStageWindow(card, 'prev', [card.id], target);
  }

  private handleNextStage(): void {
    const card = this.previewCard;
    if (!card) { return; }
    const idx = this.stageIndex(card.stage);
    const target = idx >= 0 && idx < this.stages.length - 1 ? this.stages[idx + 1] : null;
    this.openStageWindow(card, 'next', [card.id], target);
  }

  private handleColumnDrop(stageId: string | number, cardId: string): void {
    const dragged = this.getCardById(cardId);
    if (!dragged) { return; }
    const targetStage = this.stages.find((s) => s.id == stageId);
    const sourceStage = this.stages.find((s) => s.id == dragged.stage);
    if (!targetStage || !sourceStage || targetStage.id == sourceStage.id) { return; }
    // Only forward cards not already in the drop target: a multi-selection may
    // span stages or include cards already sitting in the target column.
    const cardIds = (this.selectedCards.size > 0 ? Array.from(this.selectedCards) : [cardId])
      .filter((id) => {
        const card = this.getCardById(id);
        return card != null && card.stage != targetStage.id;
      });
    if (cardIds.length === 0) { return; }
    this.openSpecificStageWindow(targetStage, cardIds, sourceStage);
  }

  private async handleSendSubmit(comments: string, additional: string, recipients: string[]): Promise<void> {
    if (!this.sendContext || !this.sendFormData) { return; }
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
            table: card!.table,
            uid: card!.uid,
            t3ver_oid: card!.t3ver_oid,
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
      } else {
        this.loadData();
        showToast('Action completed successfully', 'success');
      }
      this.sendOpen = false;
      this.previewOpen = false;
      this.sendContext = null;
      document.body.style.overflow = '';
    } catch (error: any) {
      showToast('Failed to execute: ' + (error?.message || error), 'error');
    } finally {
      this.sendPending = false;
    }
  }

  private handleSendCancel(): void {
    this.sendOpen = false;
    this.sendContext = null;
    document.body.style.overflow = this.previewOpen ? 'hidden' : '';
  }

  private moveCards(cardIds: (string | number)[], targetStageId: string | number): void {
    const ids = new Set(cardIds.map(String));
    this.cards = this.cards.map((card) => ids.has(String(card.id)) ? { ...card, stage: targetStageId } : card);
    this.clearSelection();
  }

  // --- Card context menu / actions ------------------------------------------

  private openContextMenu(card: Card, anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect();
    this.contextMenu = { card, x: rect.left, y: rect.bottom };
    setTimeout(() => document.addEventListener('mousedown', this.boundContextClose, true), 0);
  }

  private closeContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu = null;
      document.removeEventListener('mousedown', this.boundContextClose, true);
    }
  }

  private runCardAction(action: string, card: Card): void {
    this.closeContextMenu();
    switch (action) {
      case 'preview-element': this.previewElement(card); break;
      case 'edit-element': this.editCard(card); break;
      case 'page-version': this.pageVersion(card); break;
      case 'assign-record': this.openAssignModal(card); break;
      case 'delete-card': this.deleteCard(card); break;
    }
  }

  private previewElement(card: Card): void {
    this.api.dispatch({ action: 'Actions', method: 'viewSingleRecord', data: [card.table, card.uid] })
      .then((response) => {
        const url = response?.[0]?.result;
        if (url) { window.open(url, 'newTYPO3frontendWindow')?.focus(); }
      })
      .catch((error) => { console.error(error); showToast('Failed to open preview', 'error'); });
  }

  private editCard(card: Card): void {
    const base = TYPO3.settings.FormEngine.moduleUrl;
    window.location.href = `${base}&returnUrl=${encodeURIComponent(window.location.href)}&id=${TYPO3.settings.Workspaces.id}&edit[${card.table}][${card.uid}]=edit`;
  }

  private pageVersion(card: Card): void {
    const recordUid = card.table === 'pages' ? card.t3ver_oid : card.pid;
    window.location.href = `${TYPO3.settings.WebLayout.moduleUrl}&id=${recordUid}`;
  }

  private openAssignModal(card: Card): void {
    if (!TYPO3?.settings?.ajaxUrls?.kanban_workspace_assign) {
      Notification.error('Assign', 'Assign URL not configured', 5);
      return;
    }
    this.assignCard = card;
    this.assignOpen = true;
    document.body.style.overflow = 'hidden';
  }

  private handleAssignSubmit(title: string, description: string, beUser: number): void {
    const card = this.assignCard;
    if (!card) { return; }
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
        this.assignOpen = false; document.body.style.overflow = '';
        Notification.success('Assign', 'Assignment saved', 2);
        this.loadData();
      } else {
        throw new Error((result && result.message) || 'Assignment failed');
      }
    }).catch((error) => { Notification.error('Assign', error?.message || 'Assignment failed', 5); this.assignOpen = false; document.body.style.overflow = ''; });
  }

  private deleteCard(card: Card): void {
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

  private handleCardClick(card: Card): void {
    if (this.multiSelectMode) {
      const next = new Set(this.selectedCards);
      if (next.has(card.id)) { next.delete(card.id); } else { next.add(card.id); }
      this.selectedCards = next;
    } else {
      this.openPreviewModal(card);
    }
  }

  // --- Render ----------------------------------------------------------------

  private renderContextMenu(): TemplateResult | typeof nothing {
    if (!this.contextMenu) { return nothing; }
    const { card, x, y } = this.contextMenu;
    const items = [
      { action: 'preview-element', label: 'Preview Element', cls: '' },
      { action: 'edit-element', label: 'Edit Element', cls: '' },
      { action: 'page-version', label: 'Open version of page', cls: '' },
      { action: 'assign-record', label: 'Assign', cls: '' },
      { action: 'delete-card', label: 'Discard version of record', cls: 'danger' },
    ];
    return html`
      <div class="context-menu card-context-menu" style=${`position: fixed; left: ${x}px; top: ${y}px; z-index: 9999;`}
        @mousedown=${(e: Event) => e.stopPropagation()}>
        <div class="context-menu-header">Card Actions</div>
        ${items.map((item) => html`
          <div class="context-menu-item ${item.cls}" @click=${() => this.runCardAction(item.action, card)}>${item.label}</div>`)}
      </div>`;
  }

  private renderFilterBar(): TemplateResult {
    return html`
      <typo3-kanban-filter-bar
        .filters=${this.filters}
        .activeFilters=${this.activeFilters}
        @filter-change=${(e: CustomEvent) => this.handleFilterChange(e.detail.filterType, e.detail.value, e.detail.active, !!e.detail.single)}
        @filter-clear=${() => this.handleFilterClear()}></typo3-kanban-filter-bar>`;
  }

  protected override render(): TemplateResult {
    const sortedStages = [...this.stages].sort((a, b) => (a.order || 0) - (b.order || 0));
    return html`
      <section class="kanban-container">
        <div class="kanban-board" id="kanbanBoard"
          @card-click=${(e: CustomEvent) => this.handleCardClick(e.detail.card)}
          @card-menu=${(e: CustomEvent) => this.openContextMenu(e.detail.card, e.detail.anchor)}
          @card-dragstart=${(e: CustomEvent) => { this.draggedCard = e.detail.card; document.body.classList.add('dragging'); }}
          @card-dragend=${() => { this.draggedCard = null; document.body.classList.remove('dragging'); }}
          @column-drop=${(e: CustomEvent) => this.handleColumnDrop(e.detail.stageId, e.detail.cardId)}>
          ${sortedStages.map((stage) => html`
            <typo3-kanban-column
              .stage=${stage}
              .cards=${this.cardsForStage(stage)}
              .selectedCards=${this.selectedCards}></typo3-kanban-column>`)}
        </div>
      </section>

      ${this.renderContextMenu()}`;
  }

  private renderModals(): TemplateResult {
    return html`
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
        @preview-add-comment=${(e: CustomEvent) => this.handleAddComment(e.detail.text)}
        @preview-revert=${() => this.handleRevertStage()}
        @preview-next=${() => this.handleNextStage()}
        @toast=${(e: CustomEvent) => showToast(e.detail.message, e.detail.type)}></typo3-kanban-preview-modal>

      <typo3-kanban-send-to-stage-modal
        ?open=${this.sendOpen}
        .formData=${this.sendFormData}
        .context=${this.sendContext}
        ?pending=${this.sendPending}
        @send-submit=${(e: CustomEvent) => this.handleSendSubmit(e.detail.comments, e.detail.additional, e.detail.recipients)}
        @send-cancel=${() => this.handleSendCancel()}></typo3-kanban-send-to-stage-modal>

      <typo3-kanban-assign-modal
        ?open=${this.assignOpen}
        .card=${this.assignCard}
        .beUsers=${this.beUsers}
        @assign-submit=${(e: CustomEvent) => this.handleAssignSubmit(e.detail.title, e.detail.description, e.detail.be_user)}
        @assign-cancel=${() => { this.assignOpen = false; document.body.style.overflow = ''; }}
        @toast=${(e: CustomEvent) => showToast(e.detail.message, e.detail.type)}></typo3-kanban-assign-modal>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-board': KanbanBoardElement;
  }
}
