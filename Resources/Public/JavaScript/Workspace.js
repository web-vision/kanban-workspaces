import Notification from '@typo3/backend/notification.js';
import Modal from '@typo3/backend/modal.js';
import { SeverityEnum } from '@typo3/backend/enum/severity.js';
import DeferredAction from '@typo3/backend/action-button/deferred-action.js';
import Icons from '@typo3/backend/icons.js';
import Utility from '@typo3/backend/utility.js';

(function () {
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  const main = document.querySelector('.workspace-main');
  const board = document.getElementById('kanbanBoard');
  if (!main || !board) return;

  // Only allow drag-to-scroll if mousedown is on empty main area (not on a card or column)
  main.addEventListener('mousedown', function (e) {
    // Only left mouse button
    if (e.button !== 0) return;
    // Ignore if clicking on a card, column, or any child of kanban-board
    if (e.target.closest('.kanban-column, .kanban-card')) return;
    isDragging = true;
    main.classList.add('drag-scroll-active');
    startX = e.pageX - board.scrollLeft;
    scrollLeft = board.scrollLeft;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
  main.addEventListener('mouseleave', function () {
    isDragging = false;
    main.classList.remove('drag-scroll-active');
    document.body.style.cursor = '';
  });
  main.addEventListener('mouseup', function () {
    isDragging = false;
    main.classList.remove('drag-scroll-active');
    document.body.style.cursor = '';
  });
  main.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    const x = e.pageX;
    board.scrollLeft = scrollLeft - (x - startX);
  });

  // Touch support
  let touchStartX = 0;
  let touchScrollLeft = 0;
  main.addEventListener('touchstart', function (e) {
    if (e.target.closest('.kanban-column, .kanban-card')) return;
    isDragging = true;
    touchStartX = e.touches[0].pageX - board.scrollLeft;
    touchScrollLeft = board.scrollLeft;
  });
  main.addEventListener('touchend', function () {
    isDragging = false;
  });
  main.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    const x = e.touches[0].pageX;
    board.scrollLeft = touchScrollLeft - (x - touchStartX);
  });
})();

/**
 * TYPO3 Workspace Board Plugin
 * A comprehensive JavaScript framework for managing workspace content
 */

export class WorkspaceBoard {
  constructor(container, options) {
    this.container = typeof container === "string" ? document.querySelector(container) : container
    this.options = Object.assign({}, WorkspaceBoard.defaults, options)
    this.events = new EventEmitter()
    this.data = {
      cards: [],
      stages: [],
      filters: {},
      activeFilters: {},
      currentWorkspace: "main",
      searchQuery: "",
      columnUserFilters: {}, // NEW: Stores active user filter per column { stageId: userId | null }
      columnSorts: {}, // NEW: Stores active sort for each column { stageId: 'modifiedDate' | null }
      diffs: {}, // Stores TYPO3 diff data per card
      comments: {}, // Stores comments per card
      history: {}, // Stores history per card
    }
    this.ui = {
      draggedCard: null,
      draggedElement: null,
      dropZone: null,
      selectedCards: new Set(),
      isMultiSelectMode: false,
    }
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
    }

    // Action history for undo/redo
    this.actionHistory = []
    this.historyIndex = -1

    this.init()
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
  }

  // Initialize the workspace board
  init() {
    this.loadConfiguration()
    this.setupEventListeners()
    this.loadData()
    this.render()
    // Emit initialization event in next tick to ensure listeners are registered
    setTimeout(() => {
      this.emit("board:initialized", this)
    }, 0)
  }

  // Load configuration from global config
  loadConfiguration() {
    if (window.WorkspaceConfig) {
      this.data.stages = [...window.WorkspaceConfig.stages]
      this.data.filters = { ...window.WorkspaceConfig.filters }
      // Initialize column filters and sorts
      this.data.stages.forEach((stage) => {
        this.data.columnUserFilters[stage.id] = null
        this.data.columnSorts[stage.id] = null
      })

      this.data.activeFilters.depth = window.WorkspaceConfig.selectedDepth ? [String(window.WorkspaceConfig.selectedDepth)] : [];
      this.data.activeFilters.language = window.WorkspaceConfig.selectedLanguage ? [String(window.WorkspaceConfig.selectedLanguage)] : [];
      this.data.activeFilters.stage = window.WorkspaceConfig.selectedStage ? [String(window.WorkspaceConfig.selectedStage)] : [];

      if (this.options.mockData && window.WorkspaceConfig.mockData) {
        this.data.cards = [...window.WorkspaceConfig.mockData.cards]
      }
    }
  }

  // Setup all event listeners
  setupEventListeners() {
    // Global search
    const searchInput = document.getElementById("globalSearch")
    const clearSearch = document.getElementById("clearSearch")

    if (searchInput) {
      searchInput.addEventListener(
        "input",
        this.debounce((e) => {
          this.handleSearch(e.target.value)
        }, 300),
      )
    }

    if (clearSearch) {
      clearSearch.addEventListener("click", () => {
        this.clearSearch()
      })
    }

    // Filter toggle
    const filterToggle = document.getElementById("filterToggle")
    if (filterToggle) {
      filterToggle.addEventListener("click", () => {
        this.toggleFilters()
      })
    }

    // Close sidebar
    const closeSidebar = document.getElementById("closeSidebar")
    if (closeSidebar) {
      closeSidebar.addEventListener("click", () => {
        this.toggleFilters()
      })
    }

    // Modal events
    this.setupModalEvents()

    // Keyboard shortcuts - FIXED
    this.setupKeyboardShortcuts()

    // Window events
    window.addEventListener(
      "resize",
      this.debounce((e) => {
        this.handleResize()
      }, 250),
    )

    // Listen to TYPO3 color scheme changes
    document.addEventListener("typo3:color-scheme:update", (e) => {
      console.log("TYPO3 color scheme changed:", e.detail.colorScheme)
      // The theme is automatically applied to document element by TYPO3
      // No additional action needed - CSS variables will update automatically
    })

    // Custom events
    this.setupCustomEvents()
  }

  // Setup modal event listeners
  setupModalEvents() {
    // Preview modal
    const previewModal = document.getElementById("previewModal")
    const closeModal = document.getElementById("closeModal")
    const closeModalBtn = document.getElementById("closeModalBtn")

    if (closeModal) {
      closeModal.addEventListener("click", () => this.closePreviewModal())
    }
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => this.closePreviewModal())
    }

    // Modal tabs
    const tabBtns = document.querySelectorAll("#previewModal .nav-link")
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchModalTab(e.target.dataset.tab)
      })
    })

    // Close modals on overlay click
    if (previewModal) {
      previewModal.addEventListener("click", (e) => {
        if (e.target === previewModal) {
          this.closePreviewModal()
        }
      })
    }

    // Assign modal
    const assignModal = document.getElementById("assignModal")
    const closeAssignModalBtn = document.getElementById("closeAssignModal")
    const assignModalCancelBtn = document.getElementById("assignModalCancel")
    const assignModalOkBtn = document.getElementById("assignModalOk")
    if (closeAssignModalBtn) {
      closeAssignModalBtn.addEventListener("click", () => this.closeAssignModal())
    }
    if (assignModalCancelBtn) {
      assignModalCancelBtn.addEventListener("click", () => this.closeAssignModal())
    }
    if (assignModal) {
      assignModal.addEventListener("click", (e) => {
        if (e.target === assignModal) {
          this.closeAssignModal()
        }
      })
    }
    if (assignModalOkBtn) {
      assignModalOkBtn.addEventListener("click", () => this.handleAssignModalOk())
    }

    // Add comment button
    const addCommentBtn = document.getElementById("addComment")
    if (addCommentBtn) {
      addCommentBtn.addEventListener("click", () => this.handleAddComment())
    }

    // Revert stage button
    const revertStageBtn = document.getElementById("revertBtn")
    if (revertStageBtn) {
      revertStageBtn.addEventListener("click", () => this.handleRevertStage())
    }

    // Next stage button
    const nextStageBtn = document.getElementById("approveBtn")
    if (nextStageBtn) {
      nextStageBtn.addEventListener("click", () => this.handleNextStage())
    }

    // Send to Stage modal
    const sendToStageModal = document.getElementById("sendToStageModal")
    const closeSendToStageModalBtn = document.getElementById("closeSendToStageModal")
    const cancelSendToStageBtn = document.getElementById("cancelSendToStageBtn")
    const submitSendToStageBtn = document.getElementById("submitSendToStageBtn")

    if (closeSendToStageModalBtn) {
      closeSendToStageModalBtn.addEventListener("click", () => this.closeSendToStageModal())
    }
    if (cancelSendToStageBtn) {
      cancelSendToStageBtn.addEventListener("click", () => this.closeSendToStageModal())
    }
    if (submitSendToStageBtn) {
      submitSendToStageBtn.addEventListener("click", () => this.handleSendToStageSubmit())
    }
    if (sendToStageModal) {
      sendToStageModal.addEventListener("click", (e) => {
        if (e.target === sendToStageModal) {
          this.closeSendToStageModal()
        }
      })
    }
  }

  // FIXED: Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        // Allow Escape to work in inputs
        if (e.key === "Escape") {
          e.target.blur()
          this.closeAllModals()
          this.clearSelection()
        }
        return
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      // Escape key - close modals and clear selections
      if (e.key === "Escape") {
        e.preventDefault()
        this.closeAllModals()
        this.clearSelection()
      }

      // Ctrl/Cmd + F - focus search
      if (isCtrlOrCmd && e.key === "f") {
        e.preventDefault()
        const searchInput = document.getElementById("globalSearch")
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }

      // Ctrl/Cmd + Shift + F - toggle filters
      if (isCtrlOrCmd && e.shiftKey && e.key === "F") {
        e.preventDefault()
        this.toggleFilters()
      }

      // Ctrl/Cmd + Z - undo
      if (isCtrlOrCmd && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        this.undoLastAction()
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z - redo
      if (isCtrlOrCmd && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault()
        this.redoLastAction()
      }

      // Ctrl/Cmd + R - refresh board
      if (isCtrlOrCmd && e.key === "r") {
        e.preventDefault()
        this.refresh()
        this.showToast("Board refreshed", "info")
      }

      // Multi-select mode toggle
      if (isCtrlOrCmd && !this.ui.isMultiSelectMode) {
        this.ui.isMultiSelectMode = true
        document.body.classList.add("multi-select-mode")
      }
    })

    document.addEventListener("keyup", (e) => {
      // Exit multi-select mode when Ctrl/Cmd is released
      if (!e.ctrlKey && !e.metaKey && this.ui.isMultiSelectMode) {
        this.ui.isMultiSelectMode = false
        document.body.classList.remove("multi-select-mode")
      }
    })
  }

  // Setup custom event handlers
  setupCustomEvents() {
    // Card events
    this.on("card:dragstart", (card, element) => {
      this.handleCardDragStart(card, element)
    })

    this.on("card:dragend", (card, element) => {
      this.handleCardDragEnd(card, element)
    })

    this.on("card:drop", (card, targetStage, sourceStage) => {
      this.handleCardDrop(card, targetStage, sourceStage)
    })

    this.on("card:click", (card) => {
      if (this.ui.isMultiSelectMode) {
        this.toggleCardSelection(card.id)
      } else {
        this.openPreviewModal(card)
      }
    })

    // Stage events
    this.on("stage:dragover", (stage, element) => {
      this.handleStageDragOver(stage, element)
    })

    this.on("stage:dragleave", (stage, element) => {
      this.handleStageDragLeave(stage, element)
    })

    this.on("stage:drop", (stage, element) => {
      this.handleStageDrop(stage, element)
    })

    // Filter events
    this.on("filter:change", (filterType, filterValue, isActive) => {
      this.handleFilterChange(filterType, filterValue, isActive)
    })

    this.on("filter:clear", () => {
      this.handleFilterClear()
    })

    // Search events
    this.on("search:change", (query) => {
      this.handleSearchChange(query)
    })

    this.on("search:clear", () => {
      this.handleSearchClear()
    })

    // Theme events
    this.on("theme:change", (oldTheme, newTheme) => {
      this.handleThemeChange(oldTheme, newTheme)
    })
  }

  // Load data from API or mock data
  loadData() {
    // If workspace is live, skip AJAX call
    if (document.querySelector('.module')?.getAttribute('data-islive') === 'true') {
      this.data.cards = []
      this.emit("data:loaded", this.data)
      return
    }

    if (this.options.mockData && window.WorkspaceConfig && window.WorkspaceConfig.mockData) {
      this.data.cards = [...window.WorkspaceConfig.mockData.cards]
      this.emit("data:loaded", this.data)
      return
    }

    if (this.data.activeFilters && Object.keys(this.data.activeFilters).length > 0) {
      if (this.data.activeFilters.depth) {
        this.apiPayload.data[0].depth = this.data.activeFilters.depth.join(",")
      } else {
        this.apiPayload.data[0].depth = "0"
      }
      if (this.data.activeFilters.language) {
        this.apiPayload.data[0].language = this.data.activeFilters.language.join(",")
      } else {
        this.apiPayload.data[0].language = "all"
      }
      if (this.data.activeFilters.stage) {
        this.apiPayload.data[0].stage = this.data.activeFilters.stage.join(",")
      } else {
        this.apiPayload.data[0].stage = "-99"
      }
    } else {
      // Reset to default values when no filters are active
      this.apiPayload.data[0].depth = "0"
      this.apiPayload.data[0].language = "all"
      this.apiPayload.data[0].stage = "-99"
    }

    this.showLoading()
    this.fetchData()
      .then((data) => {
        this.data.cards = data.cards || []
        this.emit("data:loaded", this.data)
        this.renderBoard()
      })
      .catch((error) => {
        console.error("Failed to load data:", error)
        this.showToast("Error loading data", "error")
        this.data.cards = []
        this.renderBoard()
      })
      .finally(() => {
        this.hideLoading()
      })
  }

  // Fetch data from API
  fetchData() {
    const url = this.options.getDataApiUrl || this.options.apiUrl;

    if (!url) {
      console.error('No API URL configured');
      return Promise.reject(new Error('No API URL configured'));
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.apiPayload),
    })
      .then((response) => response.json())
      .then((apiResponse) => {
        // Convert the TYPO3 workspace data to kanban cards
        const cards = this.convertWorkspaceDataToCards(apiResponse);
        return {
          cards: cards,
          total: apiResponse[0]?.result?.total || cards.length
        };
      });
  }

  fetchCardDetails(card) {
    const url = this.options.getDataApiUrl || this.options.apiUrl;

    if (!url) {
      console.error('No API URL configured');
      return Promise.reject(new Error('No API URL configured'));
    }

    const apiPayload = {
      action: "RemoteServer",
      method: "getRowDetails",
      data: [{
        stage: card.stage,
        t3ver_oid: card.t3ver_oid,
        table: card.table,
        uid: card.uid,
        filterFields: true
      }]
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    })
      .then((response) => response.json())
      .then((apiResponse) => {
        // Convert the TYPO3 workspace row data to kanban cards history and comments
        const details = this.convertCardDetailsToFormat(apiResponse, card.id);

        if (!this.data.comments) {
          this.data.comments = {};
        }
        if (!this.data.history) {
          this.data.history = {};
        }
        if (!this.data.diffs) {
          this.data.diffs = {};
        }

        this.data.comments[card.id] = details.comments;
        this.data.history[card.id] = details.history;
        this.data.diffs[card.id] = details.diff;

        return details;
      });
  }

  processData(action, filterType, filterValue) {
    const url = this.options.getProcessApiUrl || this.options.apiUrl;

    if (!url) {
      console.error('No API URL configured');
      return Promise.reject(new Error('No API URL configured'));
    }

    const formData = new FormData();
    formData.append('action', action);
    formData.append(
      'key',
      `moduleData.web_kanbanworkspaces.${filterType}`
    );
    formData.append('value', filterValue);

    return fetch(url, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((apiResponse) => {
        console.log(apiResponse);
      });
  }

  convertWorkspaceDataToCards(apiResponse) {
    if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
      console.warn('Invalid API response format');
      return [];
    }

    const result = apiResponse[0];
    if (!result || !result.result || !result.result.data) {
      console.warn('No data found in API response');
      return [];
    }

    const workspaceData = result.result.data;

    return workspaceData.map((item, index) => {

      // Map table type to content type
      const typeMapping = {
        'pages': 'page',
        'tt_content': 'content',
      };

      // Extract editor name from various possible sources
      let editor = '';
      if (item.cruser_id || item.tstamp_user) {
        // In real implementation, you'd fetch user data
        editor = `User ${item.cruser_id || item.tstamp_user}`;
      }

      // Determine priority based on state or other factors
      let priority = 'medium';
      if (item.state_Workspace === 'new') {
        priority = 'high';
      } else if (item.state_Workspace === 'modified') {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Process integrity data from TYPO3 Workspaces IntegrityService
      const integrity = item.integrity || { status: 'success', messages: '' };

      // Adjust priority based on integrity status
      let adjustedPriority = priority;
      if (integrity.status === 'error') {
        adjustedPriority = 'critical'; // New priority level for blocking issues
      } else if (integrity.status === 'warning' && priority !== 'high') {
        adjustedPriority = 'high'; // Elevate to high if not already
      }

      // Create the card object
      return {
        id: item.id || `${item.table}_${item.uid}`,
        title: item.label_Workspace || `${item.table} record ${item.uid}`,
        type: typeMapping[item.table] || 'content',
        uid: item.uid,
        pageName: this.extractPageNameFromPath(item.path_Workspace) || 'Home',
        editor: editor,
        editorId: `user_${item.cruser_id || item.uid}`,
        modifiedDate: this.convertWorkspaceDate(item.lastChangedFormatted),
        stage: item.stage || 0,
        language: item.language || { icon: '', title: 'Default', title_crop: 'Default' },
        languageCode: item.language ? item.language.title_crop.toLowerCase().substring(0, 2) : 'en',
        priority: adjustedPriority,
        originalPriority: priority, // Preserve original priority for reference
        integrityStatus: integrity.status,
        integrityMessages: integrity.messages,
        hasSchedule: false, // TYPO3 workspace doesn't have built-in scheduling
        scheduleText: item.stage === -10 ? 'Published' : null,
        comments: 0, // Would need separate API call to get comments
        assignedUsers: item.assignee_uid ? [{ uid: item.assignee_uid, username: item.assignee_username || '', avatar_url: item.assignee_avatar_url || null }] : [],
        assignee: item.assignee_uid ? { uid: item.assignee_uid, username: item.assignee_username || '', avatar_url: item.assignee_avatar_url || null } : null,
        t3ver_oid: item.t3ver_oid || null,
        t3ver_wsid: item.t3ver_wsid || null,
        table: item.table,
        pid: item.livepid || null,
        nextStage: item.value_nextStage,
        prevStage: item.value_prevStage
      };
    });
  }

  extractPageNameFromPath(path) {
    if (!path) return 'Home';

    const parts = path.split('/').filter(part => part.length > 0);
    return parts.length > 0 ? parts[parts.length - 1] : 'Home';
  }

  // Helper function to convert TYPO3 date format to ISO string
  convertWorkspaceDate(dateString) {
    if (!dateString) return new Date().toISOString();

    try {
      // TYPO3 format is usually "YYYY-MM-DD HH:mm"
      const [datePart, timePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart ? timePart.split(':') : ['00', '00'];

      const date = new Date(year, month - 1, day, hour, minute);
      return date.toISOString();
    } catch (error) {
      console.warn('Failed to parse date:', dateString, error);
      return new Date().toISOString();
    }
  }

  // Convert TYPO3 API response to Config.js format
  convertCardDetailsToFormat(apiResponse, cardId) {
    if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
      return { comments: [], history: [], diff: [] };
    }

    const result = apiResponse[0];
    if (!result || !result.result || !result.result.data || !result.result.data[0]) {
      return { comments: [], history: [], diff: [] };
    }

    const data = result.result.data[0];

    // Transform comments
    const comments = this.transformCommentsFromAPI(data.comments || []);

    // Transform history
    const history = this.transformHistoryFromAPI(data.history || {});

    // Extract diff data (already in HTML format from TYPO3)
    const diff = data.diff || [];

    return { comments, history, diff };
  }

  // Transform comments from TYPO3 API format to Config.js format
  transformCommentsFromAPI(apiComments) {
    if (!Array.isArray(apiComments) || apiComments.length === 0) {
      return [];
    }

    return apiComments.map((comment, index) => {
      // Extract avatar from HTML or use username
      const avatarMatch = comment.user_avatar?.match(/src="([^"]+)"/);
      const avatarUrl = avatarMatch ? avatarMatch[1] : null;

      // Build content: show user comment if exists, otherwise show stage movement
      let content = '';
      if (comment.user_comment && comment.user_comment.trim() !== '') {
        content = comment.user_comment;
      } else {
        // Show stage movement without comment
        content = `Moved from "${comment.previous_stage_title}" to "${comment.stage_title}"`;
      }

      return {
        id: `c${index + 1}`,
        author: comment.user_username || 'Unknown User',
        timestamp: this.convertWorkspaceDate(comment.tstamp),
        content: content,
        avatar: avatarUrl,
        stageTitle: comment.stage_title,
        previousStageTitle: comment.previous_stage_title
      };
    });
  }

  // Transform history from TYPO3 API format to Config.js format
  transformHistoryFromAPI(apiHistory) {
    if (!apiHistory || !apiHistory.data || !Array.isArray(apiHistory.data)) {
      return [];
    }

    return apiHistory.data.map((item, index) => {
      let action = '';

      // Extract avatar from HTML or use null
      const avatarMatch = item.user_avatar?.match(/src="([^"]+)"/);
      const avatarUrl = avatarMatch ? avatarMatch[1] : null;

      // Determine action based on differences
      if (item.differences === 'insert') {
        action = 'Created card';
      } else if (Array.isArray(item.differences) && item.differences.length > 0) {
        const fields = item.differences.map(d => d.label).join(', ');
        action = `Modified: ${fields}`;
      } else {
        action = 'Updated card';
      }

      return {
        id: `h${index + 1}`,
        action: action,
        author: item.user || 'Unknown User',
        timestamp: this.convertWorkspaceDate(item.datetime),
        avatar: avatarUrl,
        differences: item.differences
      };
    });
  }

  // Render the entire board
  render() {
    this.renderBoard()
    this.renderFilters()
    this.updateUI()
  }

  // Render the kanban board
  renderBoard() {
    const boardContainer = document.getElementById("kanbanBoard")
    if (!boardContainer) return

    boardContainer.innerHTML = ""

    // Sort stages by order
    const sortedStages = [...this.data.stages].sort((a, b) => a.order - b.order)

    sortedStages.forEach((stage) => {
      const column = this.createColumn(stage)
      boardContainer.appendChild(column)
    })

    // Setup drag and drop AFTER columns are added to DOM
    if (this.options.enableDragDrop) {
      this.setupDragAndDrop()
    }

    // Emit board:rendered after board is fully rendered
    this.emit("board:rendered", this)
  }

  // Create a column element with enhanced UI
  createColumn(stage) {
    const column = document.createElement("div")
    column.className = `kanban-column stage-${stage.id}`
    column.dataset.stageId = stage.id

    // Get cards for this stage, apply global filters first
    let cardsForStage = this.getFilteredCards().filter((card) => card.stage === stage.id)

    // Apply column-specific user filter if active
    const activeColumnUserFilter = this.data.columnUserFilters[stage.id]
    if (activeColumnUserFilter) {
      cardsForStage = cardsForStage.filter((card) => (card.assignedUsers || []).includes(activeColumnUserFilter))
    }

    // Apply column-specific sort if active
    const activeColumnSort = this.data.columnSorts[stage.id]
    if (activeColumnSort === "modifiedDate") {
      cardsForStage.sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime())
    }

    column.innerHTML = `
       <div class="column-header">
           <div class="column-title-row">
               <div class="column-title-main">
                   <div class="stage-indicator" style="background-color: ${stage.color || 'var(--typo3-orange)'}"></div>
                   <span class="column-name">${this.escapeHtml(stage.label)}</span>
                   <span class="column-count">${cardsForStage.length}</span>
               </div>
               <div class="column-actions">
                   <!-- ToDo: user assignment per stage 
                    <button class="column-action" title="Assign users to stage" data-action="assign-users" data-stage-id="${stage.id}">
                       <i class="fas fa-user-plus"></i>
                   </button> -->
               </div>
           </div>
       </div>
       <div class="column-content" data-stage-id="${stage.id}">
           ${cardsForStage.length === 0
        ? '<div class="column-empty">No items in this stage</div>'
        : cardsForStage.map((card) => this.createCardHTML(card)).join("")
      }
       </div>
     `

    return column
  }

  // Create card HTML
  createCardHTML(card) {
    const typeIcon = this.getTypeIcon(card.type)
    const formattedDate = this.formatDate(card.modifiedDate)
    const priorityClass = card.priority ? `priority-${card.priority}` : ""
    const selectedClass = this.ui.selectedCards.has(card.id) ? "selected" : ""

    // Generate integrity indicator
    const integrityHTML = this.generateIntegrityHTML(card)

    // Generate due date if exists
    const dueDateHTML = card.dueDate
      ? `<div class="card-due-date ${this.isDueDateOverdue(card.dueDate) ? "overdue" : ""}">
           <i class="fas fa-calendar-alt"></i>
           <span>${this.formatDate(card.dueDate)}</span>
         </div>`
      : ""

    // Generate attachments indicator
    const attachmentsHTML =
      card.attachments && card.attachments.length > 0
        ? `<div class="card-attachments">
           <i class="fas fa-paperclip"></i>
           <span>${card.attachments.length}</span>
         </div>`
        : ""

    // Assignee(s) on card: card.assignee or card.assignedUsers; show avatar image if available
    const assignees = card.assignee ? [card.assignee] : (card.assignedUsers || []);
    const assignedUsersHTML = assignees.length > 0
      ? `<div class="card-assignees">${assignees.map((u) => {
        const title = this.escapeHtml(u.username || 'UID ' + u.uid);
        const initial = (u.username || 'U' + u.uid).charAt(0).toUpperCase();
        if (u.avatar_url) {
          return `<span class="user-avatar" title="${title}"><img src="${this.escapeHtml(u.avatar_url)}" alt="${title}" loading="lazy" onerror="this.style.display='none';var s=this.nextElementSibling;if(s)s.style.display='flex';" /><span class="user-avatar-initial" style="display:none">${initial}</span></span>`;
        }
        return `<span class="user-avatar" title="${title}">${initial}</span>`;
      }).join('')}</div>`
      : '';

    return `
       <div class="kanban-card ${priorityClass} ${selectedClass}" 
            data-card-id="${card.id}"
            data-integrity-status="${card.integrityStatus || 'success'}"
            draggable="true"
            role="button"
            tabindex="0"
            aria-label="Card: ${card.title}">
           <div class="card-header">
               <div class="card-type">
                   <i class="${typeIcon}"></i>
                   <span>${card.type}</span>
               </div>
               <div class="card-indicators">
                   ${integrityHTML}
                   ${attachmentsHTML}
               </div>
               <button class="card-menu" title="Card actions" aria-label="Card menu">
                   <i class="fas fa-ellipsis-h"></i>
               </button>
           </div>
           
           <h4 class="card-title">${this.escapeHtml(card.title)}</h4>
           
           <div class="card-meta">
               <div class="card-meta-row">
                   <span class="card-uid">UID: ${card.uid}</span>
                   <span class="card-page">${this.escapeHtml(card.pageName)}</span>
               </div>
               <div class="card-meta-row">
                   <span class="card-date">${formattedDate}</span>
               </div>
           </div>
           
           ${card.integrityMessages && card.integrityStatus !== 'success' ? `
           <div class="card-integrity-messages">
               <i class="fas fa-info-circle"></i>
               <span>${card.integrityMessages}</span>
           </div>
           ` : ''}
           
           <div class="card-badges">
               ${card.hasSchedule
        ? `<span class="card-badge schedule">
                       <i class="fas fa-clock"></i>
                       ${card.scheduleText}
                   </span>`
        : ""
      }
               ${dueDateHTML}
           </div>           
           <div class="card-footer">
               <div class="card-language">
                   ${this.renderT3Icon(card.language.icon)} ${card.languageCode.toUpperCase()}
               </div>
               ${assignedUsersHTML}
               <div class="card-stats">
                   ${card.comments > 0
        ? `<div class="card-comments">
                           <i class="fas fa-comment"></i>
                           <span>${card.comments}</span>
                       </div>`
        : ""
      }
               </div>
           </div>
       </div>
     `
  }

  // Generate integrity status indicator for cards
  // Only show badge for warning/error (not info/success)
  generateIntegrityHTML(card) {
    if (!card.integrityStatus || card.integrityStatus === 'success' || card.integrityStatus === 'info') {
      return '';
    }

    const iconMap = {
      info: 'fa-info-circle',
      warning: 'fa-exclamation-triangle',
      error: 'fa-exclamation-circle'
    };

    const labelMap = {
      info: 'Info',
      warning: 'Warning',
      error: 'Error'
    };

    const icon = iconMap[card.integrityStatus] || 'fa-info-circle';
    const label = labelMap[card.integrityStatus] || 'Info';
    const messages = card.integrityMessages || 'Integrity check';

    return `
      <div class="card-integrity integrity-${card.integrityStatus}" 
           title="${this.escapeHtml(messages)}">
        <i class="fas ${icon}"></i>
        <span class="integrity-label">${label}</span>
      </div>
    `;
  }

  // Bulk operations methods
  toggleCardSelection(cardId) {
    if (this.ui.selectedCards.has(cardId)) {
      this.ui.selectedCards.delete(cardId)
    } else {
      this.ui.selectedCards.add(cardId)
    }

    this.updateCardSelectionUI()
  }

  updateCardSelectionUI() {
    document.querySelectorAll(".kanban-card").forEach((cardEl) => {
      const cardId = cardEl.dataset.cardId
      cardEl.classList.toggle("selected", this.ui.selectedCards.has(cardId))
    })
  }

  clearSelection() {
    this.ui.selectedCards.clear()
    this.ui.isMultiSelectMode = false
    document.body.classList.remove("multi-select-mode")
    this.updateCardSelectionUI()
  }

  // Undo/Redo functionality
  addToHistory(action) {
    // Remove any actions after current index (for redo)
    this.actionHistory = this.actionHistory.slice(0, this.historyIndex + 1)
    this.actionHistory.push(action)
    this.historyIndex++

    // Limit history size
    if (this.actionHistory.length > 50) {
      this.actionHistory.shift()
      this.historyIndex--
    }
  }

  undoLastAction() {
    if (this.historyIndex >= 0) {
      const action = this.actionHistory[this.historyIndex]
      this.executeUndo(action)
      this.historyIndex--
      this.showToast("Action undone", "info")
    } else {
      this.showToast("Nothing to undo", "warning")
    }
  }

  redoLastAction() {
    if (this.historyIndex < this.actionHistory.length - 1) {
      this.historyIndex++
      const action = this.actionHistory[this.historyIndex]
      this.executeRedo(action)
      this.showToast("Action redone", "info")
    } else {
      this.showToast("Nothing to redo", "warning")
    }
  }

  executeUndo(action) {
    switch (action.type) {
      case "move":
        this.moveCard(action.cardId, action.from, false) // false to prevent new history entry
        break
      case "bulk_move":
        action.cardIds.forEach((cardId) => {
          const card = this.getCardById(cardId)
          if (card && action.originalStages && action.originalStages[cardId]) {
            this.moveCard(cardId, action.originalStages[cardId], false)
          }
        })
        break
      case "bulk_delete":
        action.deletedCardsData.forEach((cardData) => {
          this.data.cards.push(cardData) // Re-add cards
        })
        break
      case "bulk_assign":
        action.cardIds.forEach((cardId) => {
          const card = this.getCardById(cardId)
          if (card && action.originalAssignments && action.originalAssignments[cardId]) {
            card.assignedUsers = action.originalAssignments[cardId]
          }
        })
        break
    }
    this.renderBoard()
  }

  executeRedo(action) {
    switch (action.type) {
      case "move":
        this.moveCard(action.cardId, action.to, false) // false to prevent new history entry
        break
      case "bulk_move":
        action.cardIds.forEach((cardId) => {
          this.moveCard(cardId, action.targetStage, false)
        })
        break
      case "bulk_delete":
        action.cardIds.forEach((cardId) => {
          this.data.cards = this.data.cards.filter((card) => card.id !== cardId) // Re-delete cards
        })
        break
      case "bulk_assign":
        action.cardIds.forEach((cardId) => {
          const card = this.getCardById(cardId)
          if (card) {
            card.assignedUsers = Array.from(new Set([...(card.assignedUsers || []), ...action.users]))
          }
        })
        break
    }
    this.renderBoard()
  }

  // Get filtered cards (global filters only)
  getFilteredCards() {
    let cards = [...this.data.cards]
    return cards
  }

  // Setup drag and drop functionality
  setupDragAndDrop() {
    const cards = document.querySelectorAll(".kanban-card")
    const columns = document.querySelectorAll(".column-content")

    // Create drag placeholder
    this.createDragPlaceholder()

    // Setup card drag events and card menu (context menu) for each card
    cards.forEach((cardEl) => {
      const cardId = cardEl.dataset.cardId
      const cardData = this.getCardById(cardId)
      if (cardData) {
        this.setupCardDragAndClick(cardEl, cardData)
        this.setupCardMenuActions(cardEl)
      } else {
        console.warn(`Card data not found for cardId: ${cardId}`)
      }
    })

    // Setup column drop events
    columns.forEach((column) => {
      column.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"

        column.classList.add("drag-over")
        this.showPlaceholderInColumn(column)

        const stageId = column.dataset.stageId
        const stage = this.getStageById(stageId)

        if (stage) {
          this.emit("stage:dragover", stage, column)
        }
      })

      column.addEventListener("dragleave", (e) => {
        if (!column.contains(e.relatedTarget)) {
          column.classList.remove("drag-over")
          this.hidePlaceholderInColumn(column)

          const stageId = column.dataset.stageId
          const stage = this.getStageById(stageId)

          if (stage) {
            this.emit("stage:dragleave", stage, column)
          }
        }
      })

      column.addEventListener("drop", (e) => {
        e.preventDefault()
        column.classList.remove("drag-over")
        this.hidePlaceholderInColumn(column)

        const cardId = e.dataTransfer.getData("text/plain")
        const stageId = column.dataset.stageId

        if (cardId && stageId && this.ui.draggedCard) {
          const targetStage = this.getStageById(stageId)
          const sourceStage = this.getStageById(this.ui.draggedCard.stage)

          if (targetStage && sourceStage && targetStage.id != sourceStage.id) {
            // Determine if moving to next or previous stage
            const sourceStageIndex = this.data.stages.findIndex(s => s.id === sourceStage.id)
            const targetStageIndex = this.data.stages.findIndex(s => s.id === targetStage.id)

            // Show notification modal before stage transition (reusing existing logic)
            const cardIds = this.ui.selectedCards.size > 0 ? Array.from(this.ui.selectedCards) : [cardId]

            if (targetStageIndex > sourceStageIndex) {
              // Moving forward - use next stage workflow
              this.handleStageTransitionWithModal(cardIds, 'next', targetStage, sourceStage)
            } else {
              // Moving backward - use prev stage workflow
              this.handleStageTransitionWithModal(cardIds, 'prev', targetStage, sourceStage)
            }

            this.emit("card:drop", this.ui.draggedCard, targetStage, sourceStage)
          }
        }

        this.emit("stage:drop", this.getStageById(stageId), column)
      })
    })
  }

  // Centralized card drag and click setup
  setupCardDragAndClick(cardEl, cardData) {
    // Clear existing listeners to prevent duplicates after re-renders
    cardEl.removeEventListener("dragstart", cardEl._dragstartHandler)
    cardEl.removeEventListener("dragend", cardEl._dragendHandler)
    cardEl.removeEventListener("click", cardEl._clickHandler)

    // Store handlers to remove them later
    cardEl._dragstartHandler = (e) => {
      if (!cardData) {
        console.error("Card data is missing in dragstart handler")
        return
      }

      this.ui.draggedCard = cardData
      this.ui.draggedElement = e.target

      e.target.classList.add("dragging")
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", cardData.id)

      this.showDragPlaceholders(cardData)
      this.emit("card:dragstart", cardData, e.target)
    }

    cardEl._dragendHandler = (e) => {
      e.target.classList.remove("dragging")
      this.hideDragPlaceholders()

      if (this.ui.draggedCard) {
        this.emit("card:dragend", this.ui.draggedCard, e.target)
      }

      this.ui.draggedCard = null
      this.ui.draggedElement = null

      document.querySelectorAll(".column-content").forEach((col) => col.classList.remove("drag-over"))
    }

    cardEl._clickHandler = (e) => {
      if (e.target.closest(".card-menu") || e.target.closest(".user-avatar") || e.target.closest(".card-assignees")) {
        return
      }

      if (!cardData) {
        console.error("Card data is missing in click handler")
        return
      }

      this.emit("card:click", cardData)
    }

    cardEl.addEventListener("dragstart", cardEl._dragstartHandler)
    cardEl.addEventListener("dragend", cardEl._dragendHandler)
    cardEl.addEventListener("click", cardEl._clickHandler)
  }

  // Drag placeholder methods
  createDragPlaceholder() {
    if (!document.getElementById("dragPlaceholder")) {
      const placeholder = document.createElement("div")
      placeholder.id = "dragPlaceholder"
      placeholder.className = "drag-placeholder"
      placeholder.innerHTML = `
         <div class="placeholder-content">
           <i class="fas fa-plus-circle"></i>
           <span>Drop here</span>
         </div>
       `
      document.body.appendChild(placeholder)
    }
  }

  showDragPlaceholders(draggedCard) {
    const columns = document.querySelectorAll(".column-content")
    columns.forEach((column) => {
      const stageId = column.dataset.stageId
      if (stageId !== draggedCard.stage) {
        this.showPlaceholderInColumn(column)
      }
    })
  }

  hideDragPlaceholders() {
    const placeholders = document.querySelectorAll(".drop-placeholder")
    placeholders.forEach((placeholder) => placeholder.remove())
  }

  showPlaceholderInColumn(column) {
    if (!column.querySelector(".drop-placeholder")) {
      const placeholder = document.createElement("div")
      placeholder.className = "drop-placeholder"
      placeholder.innerHTML = `
         <div class="placeholder-content">
           <i class="fas fa-arrow-down"></i>
           <span>Drop here</span>
         </div>
       `
      column.appendChild(placeholder)
    }
  }

  hidePlaceholderInColumn(column) {
    const placeholder = column.querySelector(".drop-placeholder")
    if (placeholder) {
      placeholder.remove()
    }
  }

  // Render filter sidebar
  renderFilters() {
    const filterGroups = document.getElementById("filterGroups")
    if (!filterGroups) return

    filterGroups.innerHTML = ""

    Object.entries(this.data.filters).forEach(([filterType, filterConfig]) => {
      const group = document.createElement("div")
      group.className = "filter-group"

      // Special handling for depth, language, and stage filters - render as selectbox
      if (filterType === 'depth' || filterType === 'language' || filterType === 'stage') {
        // Get current selected value
        let selectedValue;
        if (filterType === 'depth') {
          selectedValue = this.data.activeFilters.depth && this.data.activeFilters.depth.length > 0
            ? this.data.activeFilters.depth[0]
            : '0';
        } else if (filterType === 'language') {
          selectedValue = this.data.activeFilters.language && this.data.activeFilters.language.length > 0
            ? this.data.activeFilters.language[0]
            : 'all';
        } else if (filterType === 'stage') {
          selectedValue = this.data.activeFilters.stage && this.data.activeFilters.stage.length > 0
            ? this.data.activeFilters.stage[0]
            : '-99';
        }

        // Add "All" option for language and stage filters
        let allOption = '';
        if (filterType === 'language') {
          allOption = '<option value="all">All Languages</option>';
        } else if (filterType === 'stage') {
          allOption = '<option value="-99">All Stages</option>';
        }

        group.innerHTML = `
         <h3 class="filter-group-title">${filterConfig.label}</h3>
         <div class="filter-options">
           <div class="filter-option" style="pointer-events: auto;">
             <select id="filter-${filterType}" 
                     data-filter-type="${filterType}"
                     class="filter-select"
                     tabindex="0">
               ${allOption}
               ${filterConfig.options
            .map(
              (option) => `
                 <option value="${option.id}" ${option.id == selectedValue ? 'selected' : ''}>
                   ${option.flag ? option.flag + ' ' : ''}${this.escapeHtml(option.label)}
                 </option>
               `,
            )
            .join("")}
             </select>
           </div>
         </div>
       `
      } else {
        // Render other filters as checkboxes
        group.innerHTML = `
         <h3 class="filter-group-title">${filterConfig.label}</h3>
         <div class="filter-options">
           ${filterConfig.options
            .map(
              (option) => `
               <div class="filter-option">
                   <input type="checkbox" 
                          id="filter-${filterType}-${option.id}"
                          data-filter-type="${filterType}"
                          data-filter-value="${option.id}"
                          ${this.isFilterActive(filterType, option.id) ? "checked" : ""}>
                   <label for="filter-${filterType}-${option.id}">
                       ${option.icon ? `<i class="${option.icon}"></i>` : ""}
                       ${option.flag ? option.flag : ""}
                       ${this.escapeHtml(option.label)}
                   </label>
               </div>
           `,
            )
            .join("")}
         </div>
       `
      }

      filterGroups.appendChild(group)
    })

    // Setup filter event listeners for checkboxes
    const checkboxes = filterGroups.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const filterType = e.target.dataset.filterType
        const filterValue = e.target.dataset.filterValue
        const isActive = e.target.checked

        this.emit("filter:change", filterType, filterValue, isActive)
      })
    })

    // Setup filter event listeners for selectboxes (depth, language, stage filters)
    const selects = filterGroups.querySelectorAll('select.filter-select')
    selects.forEach((select) => {
      // Ensure the select is focusable and clickable
      select.setAttribute('tabindex', '0');

      // Add both change and click listeners to ensure interaction
      select.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent any parent handlers from interfering
      });

      select.addEventListener("change", (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const filterType = e.target.dataset.filterType
        const filterValue = e.target.value

        // Clear previous filter first
        if (this.data.activeFilters[filterType]) {
          delete this.data.activeFilters[filterType]
        }

        this.emit("filter:change", filterType, filterValue, true)
      });

      // Add mousedown listener to ensure dropdown opens
      select.addEventListener("mousedown", (e) => {
        e.stopPropagation(); // Prevent any parent handlers from interfering
      });
    })

    // Clear all filters button
    const clearAllFilters = document.getElementById("clearAllFilters")
    if (clearAllFilters) {
      clearAllFilters.addEventListener("click", () => {
        this.emit("filter:clear")
      })
    }
  }

  // Event handlers
  handleSearch(query) {
    this.data.searchQuery = query

    const clearBtn = document.getElementById("clearSearch")
    if (clearBtn) {
      clearBtn.style.display = query ? "block" : "none"
    }

    this.renderBoard()
    this.emit("search:change", query)
  }

  clearSearch() {
    const searchInput = document.getElementById("globalSearch")
    if (searchInput) {
      searchInput.value = ""
    }

    this.handleSearch("")
    this.emit("search:clear")
  }

  toggleFilters() {
    const sidebar = document.getElementById("filterSidebar")
    const toggle = document.getElementById("filterToggle")
    const container = document.querySelector(".kanban-container")

    if (sidebar && toggle && container) {
      const isOpen = sidebar.classList.contains("open")

      if (isOpen) {
        sidebar.classList.remove("open")
        toggle.classList.remove("active")
        container.classList.remove("sidebar-open")
      } else {
        sidebar.classList.add("open")
        toggle.classList.add("active")
        container.classList.add("sidebar-open")
      }
    }
  }

  handleCardDragStart(card, element) {
    document.body.classList.add("dragging")
  }

  handleCardDragEnd(card, element) {
    document.body.classList.remove("dragging")
  }

  handleCardDrop(card, targetStage, sourceStage) {
    // Notification is handled in handleSendToStageSubmit after successful API response
    console.debug(`Dropped "${card.title}" from ${sourceStage.label} to ${targetStage.label}`)
  }

  handleStageDragOver(stage, element) {
    // Visual feedback for valid drop zone
  }

  handleStageDragLeave(stage, element) {
    // Remove visual feedback
  }

  handleStageDrop(stage, element) {
    // Handle successful drop
  }

  handleFilterChange(filterType, filterValue, isActive) {
    if (!this.data.activeFilters) {
      this.data.activeFilters = {}
    }

    if (!this.data.activeFilters[filterType]) {
      this.data.activeFilters[filterType] = []
    }

    if (isActive) {
      if (!this.data.activeFilters[filterType].includes(filterValue)) {
        this.data.activeFilters[filterType].push(filterValue)
      }
    } else {
      this.data.activeFilters[filterType] = this.data.activeFilters[filterType].filter((value) => value !== filterValue)

      if (this.data.activeFilters[filterType].length === 0) {
        delete this.data.activeFilters[filterType]
      }
    }

    this.updateActiveFiltersCount()
    this.processData('set', filterType, filterValue)
    this.loadData()
    // this.renderBoard()
  }

  handleFilterClear() {
    this.data.activeFilters = {}

    const checkboxes = document.querySelectorAll('#filterGroups input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false
    })

    // Reset all selectboxes to their default values
    const depthSelect = document.querySelector('#filter-depth')
    if (depthSelect) {
      depthSelect.value = '0' // This Page
      this.processData('clear', 'depth', '0')
    }

    const languageSelect = document.querySelector('#filter-language')
    if (languageSelect) {
      languageSelect.value = 'all' // All Languages
      this.processData('clear', 'language', 'all')
    }

    const stageSelect = document.querySelector('#filter-stage')
    if (stageSelect) {
      stageSelect.value = '-99' // All Stages
      this.processData('clear', 'stage', '-99')
    }

    this.updateActiveFiltersCount()
    this.loadData()
    // this.renderBoard()
  }

  handleSearchChange(query) {
    // Additional search handling if needed
    this.apiPayload.data[0].filterTxt = query;
    this.loadData()
  }

  handleSearchClear() {
    // Additional search clear handling if needed
  }

  handleThemeChange(oldTheme, newTheme) {
    // Additional theme change handling if needed
  }

  handleResize() {
    this.updateUI()
  }

  // Modal methods
  openPreviewModal(card) {
    const modal = document.getElementById("previewModal")
    const title = document.getElementById("modalTitle")
    const meta = document.getElementById("modalMeta")

    if (!modal || !title || !meta) return

    title.textContent = card.title
    const stage = this.getStageById(card.stage)
    const stageLabel = stage ? stage.label : card.stage
    meta.setAttribute("data-id", card.id)
    meta.innerHTML = `
       <span>UID: ${card.uid}</span>
       <span>Page: ${this.escapeHtml(card.pageName)}</span>
       ${card.editor ? `<span>Editor: ${this.escapeHtml(card.editor)}</span>` : ''}
       <span class="card-badge">${this.escapeHtml(stageLabel)}</span>
     `

    // Reset to first tab (Summary of changes)
    this.switchModalTab('changes');

    // Initialize comment count (will be updated after data loads)
    const commentsCount = document.getElementById("commentsCount")
    if (commentsCount) {
      commentsCount.textContent = '0'
    }

    modal.style.display = "flex"
    document.body.style.overflow = "hidden"

    // Fetch card details and then load modal content
    this.showLoading();
    this.fetchCardDetails(card)
      .then(() => {
        this.loadModalContent(card);
      })
      .catch((error) => {
        console.error('Failed to load card details:', error);
        this.loadModalContent(card); // Load anyway with whatever data we have
      })
      .finally(() => {
        this.hideLoading();
      });

    const firstFocusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (firstFocusable) {
      firstFocusable.focus()
    }
  }

  closePreviewModal() {
    const modal = document.getElementById("previewModal")
    if (modal) {
      modal.style.display = "none"
      document.body.style.overflow = ""
    }
  }

  closeAssignModal() {
    const assignModal = document.getElementById("assignModal")
    if (assignModal) {
      assignModal.style.display = "none"
    }
    document.body.style.overflow = ""
  }

  closeAllModals() {
    const previewModal = document.getElementById("previewModal")
    if (previewModal) {
      previewModal.style.display = "none"
    }
    const assignModal = document.getElementById("assignModal")
    if (assignModal) {
      assignModal.style.display = "none"
    }
    document.body.style.overflow = ""
  }

  switchModalTab(tabName) {
    document
      .querySelectorAll("#previewModal .nav-link")
      .forEach((btn) => btn.classList.remove("active"))
    document
      .querySelectorAll("#previewModal .tab-pane")
      .forEach((content) => content.classList.remove("active"))

    const selectedTab = document.querySelector(`#previewModal [data-tab="${tabName}"]`)
    const selectedContent = document.getElementById(`${tabName}Tab`)

    if (selectedTab) selectedTab.classList.add("active")
    if (selectedContent) selectedContent.classList.add("active")
  }

  loadModalContent(card) {
    // Load Summary of changes (diff data from TYPO3 API)
    this.loadSummaryOfChanges(card.id)
    this.loadComments(card.id)
    this.loadHistory(card.id)
  }

  loadSummaryOfChanges(cardId) {
    const changesContainer = document.getElementById("changesContainer")
    if (!changesContainer) return

    const diffData = this.data.diffs?.[cardId] || []

    if (!diffData || diffData.length === 0) {
      changesContainer.innerHTML = '<div class="no-changes"><i class="fas fa-info-circle"></i> No changes detected</div>'
      return
    }

    // Render diff data from TYPO3 API (already in HTML format)
    changesContainer.innerHTML = diffData
      .map(
        (diff) => `
        <div class="change-item">
          <div class="change-label">${this.escapeHtml(diff.label)}:</div>
          <div class="change-content">${diff.content}</div>
        </div>
      `,
      )
      .join("")
  }

  loadComments(cardId) {
    const commentsContainer = document.getElementById("commentsContainer")
    if (!commentsContainer) return

    const comments = this.getCardComments(cardId)

    // Update the comments count badge with actual number of comments
    const commentsCount = document.getElementById("commentsCount")
    if (commentsCount) {
      commentsCount.textContent = comments.length.toString()
    }

    if (comments.length === 0) {
      commentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>'
      return
    }

    commentsContainer.innerHTML = comments
      .map(
        (comment) => `
         <div class="comment">
           <div class="comment-avatar">
             ${comment.avatar ? `<img src="${comment.avatar}" alt="${this.escapeHtml(comment.author)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : this.getInitials(comment.author)}
           </div>
           <div class="comment-content">
             <div class="comment-header">
               <span class="comment-author">${this.escapeHtml(comment.author)}</span>
               <span class="comment-time">${this.formatDate(comment.timestamp)}</span>
             </div>
             <div class="comment-text">${this.escapeHtml(comment.content)}</div>
           </div>
         </div>
         ${comment.replies
            ? comment.replies
              .map(
                (reply) => `
           <div class="comment reply">
             <div class="comment-avatar">
               ${reply.avatar ? `<img src="${reply.avatar}" alt="${this.escapeHtml(reply.author)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : this.getInitials(reply.author)}
             </div>
             <div class="comment-content">
               <div class="comment-header">
                 <span class="comment-author">${this.escapeHtml(reply.author)}</span>
                 <span class="comment-time">${this.formatDate(reply.timestamp)}</span>
               </div>
               <div class="comment-text">${this.escapeHtml(reply.content)}</div>
             </div>
           </div>
         `,
              )
              .join("")
            : ""
          }
       `,
      )
      .join("")
  }

  // Handle adding a new comment
  handleAddComment() {
    const commentTextarea = document.getElementById("newComment")
    const addCommentBtn = document.getElementById("addComment")

    if (!commentTextarea || !addCommentBtn) return

    const commentText = commentTextarea.value.trim()

    if (!commentText) {
      this.showToast("Please enter a comment", "warning")
      return
    }

    // Get the current card ID from the modal
    const modalMeta = document.getElementById("modalMeta")
    if (!modalMeta) return

    const cardId = modalMeta.getAttribute('data-id')

    // Find the card by title (you may want to store cardId differently)
    const currentCard = this.getCardById(cardId);
    if (!currentCard) {
      this.showToast("Unable to identify current card", "error")
      return
    }

    // Disable button and show loading state
    addCommentBtn.disabled = true
    addCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...'

    // Prepare API request
    const url = this.options.getDataApiUrl || this.options.apiUrl
    if (!url) {
      console.error('No API URL configured for adding comments')
      this.showToast("API URL not configured", "error")
      addCommentBtn.disabled = false
      addCommentBtn.innerHTML = '<i class="fas fa-comment"></i> Add Comment'
      return
    }

    const payload = {
      action: "Actions",
      method: "sendToSpecificStageExecute",
      data: [{
        "comments": commentText,
        "affects": {
          "elements": [
            {
              "table": currentCard.table,
              "uid": currentCard.uid,
              "t3ver_oid": currentCard.t3ver_oid
            }
          ],
          "nextStage": currentCard.stage
        }
      }]
    }

    // Send AJAX POST request
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    })
      .then(response => response.json())
      .then(result => {
        if (result && result.success !== false) {
          // Clear the textarea
          commentTextarea.value = ''

          // Show success message
          this.showToast("Comment added successfully", "success")

          // Reload comments to show the new one
          this.fetchCardDetails(currentCard)
            .then(() => {
              this.loadComments(currentCard.id)
            })
            .catch(error => {
              console.error('Failed to reload comments:', error)
            })

          // Emit event
          this.emit("comment:added", currentCard.id, commentText)
        } else {
          throw new Error((result && result.message) || "Failed to add comment")
        }
      })
      .catch((error) => {
        console.error("Failed to add comment:", error)
        this.showToast("Failed to add comment: " + error.message, "error")
      })
      .finally(() => {
        // Re-enable button
        addCommentBtn.disabled = false
        addCommentBtn.innerHTML = '<i class="fas fa-comment"></i> Add Comment'
      })
  }

  // Open the custom Send to Stage modal
  openSendToStageModal(formData, context) {
    const modal = document.getElementById("sendToStageModal")
    if (!modal) return

    // Store context for submit handler
    this.currentStageFormContext = context
    this.currentStageFormData = formData

    // Update UI
    const recipientsGroup = document.getElementById("recipientsGroup")
    const recipientsList = document.getElementById("stageRecipientsList")
    const additionalGroup = document.getElementById("additionalRecipientsGroup")
    const commentsInput = document.getElementById("stageComments")
    const infoBanner = document.getElementById("stageInfoBanner")
    const infoText = document.getElementById("stageInfoText")

    // Reset form
    if (commentsInput) commentsInput.value = (formData.comments && formData.comments.value) || ""
    if (document.getElementById("stageAdditionalRecipients")) {
      document.getElementById("stageAdditionalRecipients").value = (formData.additional && formData.additional.value) || ""
    }

    // Setup Info Banner
    if (infoBanner && infoText) {
      if (context.targetStage) {
        infoText.textContent = `Sending ${context.cardIds.length > 1 ? context.cardIds.length + ' items' : 'item'} to ${context.targetStage.label}`
        infoBanner.style.display = "flex"
      } else {
        infoBanner.style.display = "none"
      }
    }

    // Render recipients
    if (recipientsList && formData.sendMailTo && formData.sendMailTo.length > 0) {
      recipientsGroup.style.display = "block"
      recipientsList.innerHTML = formData.sendMailTo.map(recipient => `
        <div class="stage-recipient-item">
            <div class="checkbox-label">
                <input 
                  type="checkbox" 
                  class="t3js-workspace-recipient" 
                  id="${recipient.name}" 
                  value="${recipient.value}"
                  ${recipient.checked ? 'checked' : ''}
                  ${recipient.disabled ? 'disabled' : ''}
                />
                <span class="checkmark"></span>
                <label for="${recipient.name}">${this.escapeHtml(recipient.label)}</label>
            </div>
        </div>
      `).join("")
    } else {
      if (recipientsGroup) recipientsGroup.style.display = "none"
    }

    // Render additional recipients
    if (additionalGroup) {
      additionalGroup.style.display = formData.additional ? "block" : "none"
    }

    // Show modal
    modal.style.display = "flex"
    document.body.style.overflow = "hidden"

    // Focus comments
    if (commentsInput) commentsInput.focus()
  }

  closeSendToStageModal() {
    const modal = document.getElementById("sendToStageModal")
    if (modal) {
      modal.style.display = "none"
      document.body.style.overflow = ""
    }

    // If cancelled and we have context (drag drop), revert
    if (this.currentStageFormContext && this.currentStageFormContext.isDragDrop) {
      this.renderBoard()
    }

    this.currentStageFormContext = null
    this.currentStageFormData = null
  }

  async handleSendToStageSubmit() {
    if (!this.currentStageFormContext || !this.currentStageFormData) return

    const { url, executeMethod, cardIds, targetStage } = this.currentStageFormContext
    const submitBtn = document.getElementById("submitSendToStageBtn")

    // Collect form data
    const comments = document.getElementById("stageComments")?.value || ""
    const additional = document.getElementById("stageAdditionalRecipients")?.value || ""

    // Get checked recipients
    const recipients = []
    document.querySelectorAll(".t3js-workspace-recipient:checked").forEach(cb => {
      recipients.push(cb.value)
    })

    // Construct form values object (mimicking Utility.convertFormToObject)
    const formValues = {
      comments: comments,
      recipients: recipients,
      additional: additional,
      affects: this.currentStageFormData.affects
    }

    const executePayload = {
      action: "Actions",
      method: executeMethod,
      data: [formValues]
    }

    // UI Loading state
    if (submitBtn) {
      const originalText = submitBtn.innerHTML
      submitBtn.disabled = true
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'

      try {
        const executeResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify(executePayload),
        })

        if (!executeResponse.ok) {
          throw new Error(`HTTP error! status: ${executeResponse.status}`)
        }

        const executeResult = await executeResponse.json()
        console.log(`${executeMethod} response:`, executeResult)

        if (executeResult && executeResult[0]?.result?.success !== false) {
          // Success
          if (targetStage) {
            this.moveCard(cardIds, targetStage.id, true)
            Notification.success(
              TYPO3.lang['actionSendToStage'] || 'Send to stage',
              `Content moved to ${targetStage.label} and notifications sent`
            )
          } else {
            // Refresh if not a drag-drop (revert/next)
            this.loadData()
            this.closePreviewModal()
            this.showToast("Action completed successfully", "success")
          }

          // Close modal (skip revert logic)
          this.currentStageFormContext = null
          const modal = document.getElementById("sendToStageModal")
          if (modal) {
            modal.style.display = "none"
            document.body.style.overflow = ""
          }
        } else {
          throw new Error(executeResult[0]?.result?.message || "Stage transition failed")
        }
      } catch (error) {
        console.error("Failed to execute stage transition:", error)
        this.showToast("Failed to execute: " + error.message, "error")
        // Revert on error
        this.renderBoard()
      } finally {
        submitBtn.disabled = false
        submitBtn.innerHTML = originalText
      }
    }
  }

  /**
   * Handle stage transition with modal for drag and drop
   * Reuses existing sendToStageWindow/Execute logic
   */
  async handleStageTransitionWithModal(cardIds, direction, targetStage, sourceStage) {
    try {
      const url = TYPO3.settings.ajaxUrls["workspace_dispatch"]
      if (!url) {
        console.error("workspace_dispatch URL not available")
        return
      }

      // Use the first card for the API call (TYPO3 workspaces handles one card at a time)
      const cardId = Array.isArray(cardIds) ? cardIds[0] : cardIds

      // Get the card object to extract workspace version info
      const card = this.getCardById(cardId)
      if (!card) {
        console.error("Card not found:", cardId)
        this.showToast("Card not found", "error")
        return
      }

      // Step 1: Get window data using sendToNextStageWindow or sendToPrevStageWindow
      const method = direction === 'next' ? 'sendToNextStageWindow' : 'sendToPrevStageWindow'
      const executeMethod = direction === 'next' ? 'sendToNextStageExecute' : 'sendToPrevStageExecute'

      // Build payload with correct parameter structure
      // sendToNextStageWindow expects: ($uid, $table, $t3ver_oid)
      // sendToPrevStageWindow expects: ($uid, $table)
      const payload = {
        action: "Actions",
        method: method,
        data: direction === 'next'
          ? [card.uid, card.table, card.t3ver_oid]
          : [card.uid, card.table]
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`${method} API response:`, data)

      if (!data || !data[0] || !data[0].result) {
        throw new Error(`Invalid response from ${method}`)
      }

      const formData = data[0].result

      // Open custom modal instead of TYPO3 Modal
      this.openSendToStageModal(formData, {
        url: url,
        executeMethod: executeMethod,
        cardIds: cardIds,
        targetStage: targetStage,
        sourceStage: sourceStage,
        isDragDrop: true
      })

    } catch (error) {
      console.error("Failed to load stage form:", error)
      this.showToast("Failed to load stage form: " + error.message, "error")
      // Revert the visual state on error
      this.renderBoard()
    }
  }

  async handleRevertStage() {
    const revertBtn = document.getElementById("revertBtn")

    if (!revertBtn) return

    // Get the current card ID from the modal
    const modalMeta = document.getElementById("modalMeta")
    if (!modalMeta) return

    const cardId = modalMeta.getAttribute('data-id')

    // Find the card by ID
    const currentCard = this.getCardById(cardId);
    if (!currentCard) {
      this.showToast("Unable to identify current card", "error")
      return
    }

    // Prepare API request
    const url = this.options.getDataApiUrl || this.options.apiUrl
    if (!url) {
      console.error('No API URL configured for stage transition')
      this.showToast("API URL not configured", "error")
      return
    }

    // Step 1: Fetch stage form data by calling sendToPrevStageWindow
    const windowPayload = {
      action: "Actions",
      method: "sendToPrevStageWindow",
      data: [currentCard.uid, currentCard.table]
    }

    try {
      const windowResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(windowPayload),
      })

      const windowResult = await windowResponse.json()

      if (!windowResult || windowResult.length === 0 || !windowResult[0].result) {
        throw new Error("Invalid response from sendToPrevStageWindow")
      }

      const formData = windowResult[0].result

      // Debug: Log form data structure
      console.log('sendToPrevStageWindow API response:', windowResult)
      console.log('Form data:', formData)

      // Open custom modal
      this.openSendToStageModal(formData, {
        url: url,
        executeMethod: "sendToPrevStageExecute",
        cardIds: [currentCard.id],
        // targetStage: null for revert (handled differently or implied)
        isDragDrop: false
      })

    } catch (error) {
      console.error("Failed to load stage form:", error)
      this.showToast("Failed to load stage form: " + error.message, "error")
    }
  }

  async handleNextStage() {
    const approveBtn = document.getElementById("approveBtn")
    if (!approveBtn) return

    // Get the current card ID from the modal
    const modalMeta = document.getElementById("modalMeta")
    if (!modalMeta) return

    const cardId = modalMeta.getAttribute('data-id')

    // Find the card by ID
    const currentCard = this.getCardById(cardId);
    if (!currentCard) {
      this.showToast("Unable to identify current card", "error")
      return
    }

    // Prepare API request
    const url = this.options.getDataApiUrl || this.options.apiUrl
    if (!url) {
      console.error('No API URL configured for stage transition')
      this.showToast("API URL not configured", "error")
      return
    }

    // Step 1: Fetch stage form data by calling sendToNextStageWindow
    const windowPayload = {
      action: "Actions",
      method: "sendToNextStageWindow",
      data: [currentCard.uid, currentCard.table, currentCard.t3ver_oid]
    }

    try {
      const windowResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(windowPayload),
      })

      const windowResult = await windowResponse.json()

      if (!windowResult || windowResult.length === 0 || !windowResult[0].result) {
        throw new Error("Invalid response from sendToNextStageWindow")
      }

      const formData = windowResult[0].result

      // Debug: Log form data structure
      console.log('sendToNextStageWindow API response:', windowResult)
      console.log('Form data:', formData)

      // Open custom modal
      this.openSendToStageModal(formData, {
        url: url,
        executeMethod: "sendToNextStageExecute",
        cardIds: [currentCard.id],
        // targetStage: null (will imply next stage via ID usually, or handled by API)
        isDragDrop: false
      })

    } catch (error) {
      console.error("Failed to load stage form:", error)
      this.showToast("Failed to load stage form: " + error.message, "error")
    }
  }

  loadHistory(cardId) {
    const historyContainer = document.getElementById("historyContainer")
    if (!historyContainer) return

    const history = this.getCardHistory(cardId)

    if (history.length === 0) {
      historyContainer.innerHTML = '<div class="no-history"><i class="fas fa-info-circle"></i> No history available</div>'
      return
    }

    historyContainer.innerHTML = history
      .map(
        (item) => `
         <div class="history-item">
           <div class="history-header">
             <div class="history-avatar">
               ${item.avatar ? `<img src="${item.avatar}" alt="${this.escapeHtml(item.author)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : this.getInitials(item.author)}
             </div>
             <div class="history-meta">
               <div class="history-user">${this.escapeHtml(item.author)}</div>
               <div class="history-date">${item.datetime || this.formatDate(item.timestamp)}</div>
             </div>
           </div>
           ${item.differences && Array.isArray(item.differences) && item.differences.length > 0 ? `
           <div class="history-differences">
             ${item.differences.map(diff => `
               <div class="history-diff-item">
                 <div class="history-diff-label">${this.escapeHtml(diff.label)}:</div>
                 <div class="history-diff-content">${diff.html}</div>
               </div>
             `).join('')}
           </div>
           ` : `
           <div class="history-action">${this.escapeHtml(item.action || 'Updated record')}</div>
           `}
         </div>
       `,
      )
      .join("")
  }

  // Card operations
  moveCard(cardId, targetStageId, addToHistory = true) {
    // Handle both single cardId (string) and array of cardIds
    const cardIds = Array.isArray(cardId) ? cardId : [cardId];

    const cards = [];
    const oldStages = {};

    console.log("selected cards : ", cardIds);

    // Process each card
    cardIds.forEach(id => {
      const card = this.getCardById(id);
      if (!card) return;

      oldStages[id] = card.stage;
      card.stage = targetStageId;
      cards.push(card);
    });

    if (cards.length === 0) return;

    this.renderBoard();

    // Emit card:moved event with array of cards - let App.js handle saving
    this.emit("card:moved", cards, targetStageId, oldStages);

    // if (addToHistory) {
    //   this.addToHistory({
    //     type: "move",
    //     cardId: cardId,
    //     from: oldStage,
    //     to: targetStageId,
    //     timestamp: Date.now(),
    //   })
    // }
  }

  // Revert card move - called by App.js if save fails
  revertCardMove(cardId, sourceStageId) {
    const card = this.getCardById(cardId)
    if (card) {
      card.stage = sourceStageId
      this.renderBoard()
    }
  }

  // Setup card menu button actions
  setupCardMenuActions(cardElement) {
    const menuButton = cardElement.querySelector('.card-menu')
    if (menuButton) {
      // Remove existing listener to prevent duplicates
      if (menuButton._clickListener) {
        menuButton.removeEventListener('click', menuButton._clickListener)
      }

      const handler = (e) => {
        e.stopPropagation()
        const cardId = cardElement.dataset.cardId
        this.showCardContextMenu(cardId, menuButton)
      }

      menuButton.addEventListener('click', handler)
      menuButton._clickListener = handler
    }
  }

  // Show card context menu with available actions
  showCardContextMenu(cardId, triggerElement) {
    const card = this.getCardById(cardId)
    if (!card) return

    // Remove any existing menu
    const existingMenu = document.querySelector(".context-menu")
    if (existingMenu) existingMenu.remove()

    const menu = this.createCardContextMenu(card)
    document.body.appendChild(menu)

    // Position menu (similar to stage context menu)
    const rect = triggerElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    menu.style.position = "fixed"
    menu.style.zIndex = "9999"

    // Position horizontally
    if (rect.left + menu.offsetWidth > viewportWidth) {
      menu.style.right = viewportWidth - rect.right + "px"
    } else {
      menu.style.left = rect.left + "px"
    }

    // Position vertically
    if (rect.bottom + menu.offsetHeight + 10 > viewportHeight) {
      menu.style.bottom = viewportHeight - rect.top + 5 + "px"
    } else {
      menu.style.top = rect.bottom + 5 + "px"
    }

    // Click handler for menu actions
    const handleMenuClick = (e) => {
      const menuItem = e.target.closest(".context-menu-item")
      if (menuItem) {
        const action = menuItem.dataset.action
        this.handleCardContextMenuAction(action, card)
        menu.remove()
        document.removeEventListener("mousedown", handleOutsideClick, true)
      }
    }
    menu.addEventListener("click", handleMenuClick)

    // Close menu on outside click
    const handleOutsideClick = (e) => {
      if (!menu.contains(e.target) && e.target !== triggerElement) {
        menu.remove()
        document.removeEventListener("mousedown", handleOutsideClick, true)
      }
    }
    setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick, true)
    }, 0)
  }

  // Create card context menu HTML
  createCardContextMenu(card) {
    const menu = document.createElement("div")
    menu.className = "context-menu card-context-menu"

    // Get available stages for move actions
    const currentStage = this.getStageById(card.stage)
    const otherStages = this.data.stages.filter(s => s.id !== card.stage)

    // Build move options HTML
    const moveOptionsHTML = otherStages.length > 0 ? `
      <div class="context-menu-item" data-action="move-card" data-card-id="${card.id}">
        <i class="fas fa-arrows-alt"></i>
        <span>Move to Stage</span>
        <i class="fas fa-chevron-right submenu-arrow"></i>
      </div>
    ` : ''

    menu.innerHTML = `
      <div class="context-menu-header">
        <i class="fas fa-id-card"></i>
        <span>Card Actions</span>
      </div>
      <div class="context-menu-item" data-action="preview-element" data-card-id="${card.id}">
        <i class="fas fa-eye"></i>
        <span>Preview Element</span>
      </div>
      <div class="context-menu-item" data-action="edit-element" data-card-id="${card.id}">
        <i class="fas fa-pen"></i>
        <span>Edit Element</span>
      </div>
      <div class="context-menu-item" data-action="page-version" data-card-id="${card.id}">
        <i class="fas fa-edit"></i>
        <span>Open version of page</span>
      </div>
      <div class="context-menu-item" data-action="assign-record" data-card-id="${card.id}">
        <i class="fas fa-user-plus"></i>
        <span>Assign</span>
      </div>
      <div class="context-menu-item danger" data-action="delete-card" data-card-id="${card.id}">
        <i class="fas fa-trash"></i>
        <span>Discard version of record</span>
      </div>
    `

    return menu
  }

  // Handle card context menu actions
  handleCardContextMenuAction(action, card) {
    switch (action) {
      case "preview-element":
        this.previewElement(card)
        break
      case "edit-element":
        this.editCard(card)
        break
      case "page-version":
        this.pageVersion(card)
        break
      case "assign-record":
        this.openAssignModal(card)
        break
      case "delete-card":
        this.deleteCard(card)
        break
      default:
        console.log(`Card action not implemented: ${action}`)
    }
  }

  // Card action methods
  previewElement(card) {
    const url = this.options.getDataApiUrl || this.options.apiUrl;

    if (!url) {
      console.error('No API URL configured');
      return Promise.reject(new Error('No API URL configured'));
    }

    const payload = {
      action: "Actions",
      method: "viewSingleRecord",
      data: [card.table, card.uid]
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((apiResponse) => {
        if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
          console.warn('Invalid API response format');
          return [];
        }

        const result = apiResponse[0];
        if (!result || !result.result) {
          console.warn('No data found in API response');
          return [];
        }
        const newTab = window.open(result.result, 'newTYPO3frontendWindow');
        newTab.focus();
      });
  }

  editCard(card) {
    const newUrl = TYPO3.settings.FormEngine.moduleUrl
      + '&returnUrl=' + encodeURIComponent(document.location.href)
      + '&id=' + TYPO3.settings.Workspaces.id + '&edit[' + card.table + '][' + card.uid + ']=edit';

    window.location.href = newUrl;
    this.showToast(`Edit functionality for card "${card.title}" - would open TYPO3 editor`, "info")
  }

  pageVersion(card) {
    const recordUid = card.table === 'pages' ? card.t3ver_oid : card.pid;
    window.location.href = TYPO3.settings.WebLayout.moduleUrl + '&id=' + recordUid;
  }

  openAssignModal(card) {
    const assignUrl = TYPO3.settings?.ajaxUrls?.kanban_workspace_assign;
    if (!assignUrl) {
      Notification.error('Assign', 'Assign URL not configured', 5);
      return;
    }
    this._assignModalCard = card;

    const assignModal = document.getElementById('assignModal');
    const assignModalTitle = document.getElementById('assignModalTitle');
    const assignModalBody = document.getElementById('assignModalBody');
    if (!assignModal || !assignModalTitle || !assignModalBody) return;

    const titleLabel = TYPO3.lang?.['labels.title'] || 'Title';
    const descLabel = TYPO3.lang?.['labels.description'] || 'Description';
    const assigneeLabel = TYPO3.lang?.['labels.assignee'] || 'Assignee (Backend user UID)';
    const selectUserLabel = TYPO3.lang?.['labels.selectUser'] || '-- Select user --';
    const modalTitleText = TYPO3.lang?.['window.assign.title'] || 'Assign Record';

    const beUsers = window.WorkspaceConfig?.beUsers || [];
    const currentAssigneeUid = card.assignee?.uid != null ? parseInt(card.assignee.uid, 10) : null;
    const optionsHTML = beUsers.map((u) => {
      const selected = currentAssigneeUid === u.uid ? ' selected' : '';
      const username = this.escapeHtml(String(u.username || ''));
      return `<option value="${u.uid}"${selected}>${username} (${u.uid})</option>`;
    }).join('');
    const formHTML = `
      <form class="t3js-assign-form">
        <div class="form-group mb-3">
          <label class="form-label">${titleLabel}</label>
          <input type="text" name="title" class="form-control" />
        </div>
        <div class="form-group mb-3">
          <label class="form-label">${descLabel}</label>
          <textarea name="description" class="form-control" rows="3"></textarea>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">${assigneeLabel}</label>
          <select name="be_user" class="form-control form-select" required>
            <option value="">${selectUserLabel}</option>
            ${optionsHTML}
          </select>
        </div>
      </form>
    `;

    assignModalTitle.textContent = modalTitleText;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = formHTML;
    assignModalBody.replaceChildren(...wrapper.childNodes);

    assignModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  async handleAssignModalOk() {
    const card = this._assignModalCard;
    if (!card) return;
    const assignUrl = TYPO3.settings?.ajaxUrls?.kanban_workspace_assign;
    if (!assignUrl) return;

    const assignModal = document.getElementById('assignModal');
    const form = assignModal?.querySelector('.t3js-assign-form');
    if (!form) return;

    const data = Utility.convertFormToObject(form);
    const beUser = parseInt(data.be_user, 10);
    if (!beUser || beUser < 1) {
      Notification.warning('Assign', 'Please select an assignee', 3);
      return;
    }

    const workspaceId = card.t3ver_wsid != null ? parseInt(card.t3ver_wsid, 10) : (TYPO3.settings?.Workspaces?.id != null ? parseInt(TYPO3.settings.Workspaces.id, 10) : 0);
    const payload = {
      table: card.table,
      record_uid: parseInt(card.uid, 10),
      workspace_id: workspaceId,
      stage_id: parseInt(card.stage, 10) || 0,
      be_user: beUser,
      title: (data.title || '').trim(),
      description: (data.description || '').trim(),
    };

    try {
      const response = await fetch(assignUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ data: [payload] }),
      });
      const result = await response.json();
      if (result && result.success !== false) {
        this.closeAssignModal();
        Notification.success('Assign', 'Assignment saved', 2);
        this.loadData();
      } else {
        throw new Error(result?.error || 'Assign failed');
      }
    } catch (err) {
      console.error('Assign failed:', err);
      Notification.error('Assign', err.message || 'Failed to save assignment', 5);
      this.closeAssignModal();
    }
  }

  deleteCard(card) {
    const url = this.options.getDataApiUrl || this.options.apiUrl;

    if (!url) {
      console.error('No API URL configured');
      return Promise.reject(new Error('No API URL configured'));
    }

    const payload = {
      action: "Actions",
      method: "deleteSingleRecord",
      data: [card.table, card.uid]
    };

    // Create deferred action for the delete operation
    const deleteAction = new DeferredAction(() => {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((response) => response.json())
        .then((apiResponse) => {
          if (!apiResponse || !Array.isArray(apiResponse) || apiResponse.length === 0) {
            console.warn('Invalid API response format');
            throw new Error('Invalid API response format');
          }

          const result = apiResponse[0];
          if (!result) {
            console.warn('No data found in API response');
            throw new Error('No data found in API response');
          }

          // Reload data and show success message
          this.loadData();
          this.showToast(`Card "${card.title}" deleted successfully`, "success");

          return result;
        })
        .catch((error) => {
          console.error('Failed to delete card:', error);
          this.showToast(`Failed to delete card: ${error.message}`, "error");
          throw error;
        });
    });

    // Show TYPO3 Modal with error severity
    Modal.advanced({
      title: 'Discard version of record',
      content: `Do you really want to discard this version from workspace?\n\nCard: ${card.title}\nTable: ${card.table}\nUID: ${card.uid}`,
      severity: SeverityEnum.error,
      buttons: [
        {
          text: 'Cancel',
          btnClass: 'btn-default',
          trigger: () => {
            Modal.dismiss();
          }
        },
        {
          text: 'Discard version',
          btnClass: 'btn-danger',
          action: deleteAction
        }
      ]
    });

    return Promise.resolve();
  }

  // Utility methods
  getCardById(cardId) {
    // Handle both string and number cardId (dataset returns strings)
    return this.data.cards.find((card) => card.id == cardId || card.id === cardId)
  }

  getStageById(stageId) {
    // Handle both string and number stageId (dataset returns strings)
    return this.data.stages.find((stage) => stage.id == stageId || stage.id === stageId)
  }

  getUserById(userId) {
    if (window.WorkspaceConfig && window.WorkspaceConfig.users) {
      return window.WorkspaceConfig.users.find((user) => user.id === userId)
    }
    return null
  }

  getCardComments(cardId) {
    if (this.data && this.data.comments) {
      const comments = this.data.comments[cardId];
      if (comments) return comments;
    }
    return []
  }

  getCardHistory(cardId) {
    if (this.data && this.data.history) {
      const history = this.data.history[cardId];
      if (history) return history;
    }
    return []
  }

  isFilterActive(filterType, filterValue) {
    return this.data.activeFilters[filterType] && this.data.activeFilters[filterType].includes(filterValue)
  }

  updateActiveFiltersCount() {
    const count = Object.values(this.data.activeFilters).reduce((total, filters) => total + filters.length, 0)

    const countElement = document.getElementById("activeFiltersCount")
    if (countElement) {
      countElement.textContent = count
    }
  }

  updateUI() {
    const isMobile = window.innerWidth < 768
    document.body.classList.toggle("mobile", isMobile)
  }

  getTypeIcon(type) {
    const icons = {
      content: "fas fa-file-text",
      page: "fas fa-globe",
      template: "fas fa-layout",
      news: "fas fa-newspaper",
      form: "fas fa-wpforms",
    }
    return icons[type] || "fas fa-file"
  }

  renderT3Icon(iconIdentifier) {
    if (!iconIdentifier) {
      return '<span class="t3js-icon icon icon-size-small icon-state-default"><span class="icon-markup">🌐</span></span>';
    }
    // Use a placeholder that will be replaced by the actual icon
    const placeholderId = `icon-${iconIdentifier.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // Fetch and inject the icon asynchronously
    setTimeout(() => {
      Icons.getIcon(iconIdentifier, Icons.sizes.small).then((iconMarkup) => {
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) {
          placeholder.outerHTML = iconMarkup;
        }
      }).catch(() => {
        // Fallback on error
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) {
          placeholder.outerHTML = '<span class="t3js-icon icon icon-size-small icon-state-default"><span class="icon-markup">🌐</span></span>';
        }
      });
    }, 0);
    return `<span id="${placeholderId}" class="t3js-icon icon icon-size-small icon-state-default"><span class="icon-markup">🌐</span></span>`;
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  getInitials(name) {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  showLoading() {
    const overlay = document.getElementById("loadingOverlay")
    if (overlay) {
      overlay.style.display = "flex"
    }
  }

  hideLoading() {
    const overlay = document.getElementById("loadingOverlay")
    if (overlay) {
      overlay.style.display = "none"
    }
  }

  showToast(message, type = "info", duration = 5000) {
    // Map custom types to TYPO3 Notification severities
    const severityMap = {
      'success': 1, // OK
      'info': 0,    // INFO  
      'warning': 2, // WARNING
      'error': 3    // ERROR
    };

    const severity = severityMap[type] || 0;
    const durationInSeconds = Math.floor(duration / 1000);

    if (typeof Notification !== 'undefined') {
      // Use TYPO3 Notification API
      switch (severity) {
        case 1: // success
          Notification.success('', message, durationInSeconds);
          break;
        case 2: // warning
          Notification.warning('', message, durationInSeconds);
          break;
        case 3: // error
          Notification.error('', message, durationInSeconds);
          break;
        default: // info
          Notification.info('', message, durationInSeconds);
      }
    } else {
      // Fallback to console if Notification API is not available
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  // Public API methods
  on(event, callback) {
    return this.events.on(event, callback)
  }

  off(event, callback) {
    return this.events.off(event, callback)
  }

  emit(event, ...args) {
    return this.events.emit(event, ...args)
  }

  refresh() {
    this.loadData()
  }

  destroy() {
    this.events.events = {}

    window.removeEventListener("resize", this.handleResize)

    if (this.container) {
      this.container.innerHTML = ""
    }

    this.emit("board:destroyed", this)
  }
}

// Event Emitter for custom events (kept as a separate utility class)
class EventEmitter {
  constructor() {
    this.events = {}
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
    return this
  }

  off(event, callback) {
    if (!this.events[event]) return this

    if (!callback) {
      delete this.events[event]
      return this
    }

    this.events[event] = this.events[event].filter((cb) => cb !== callback)
    return this
  }

  emit(event, ...args) {
    if (!this.events[event]) return this

    this.events[event].forEach((callback) => {
      try {
        callback.apply(this, args)
      } catch (error) {
        console.error(`Event callback error for ${event}:`, error)
      }
    })
    return this
  }
}