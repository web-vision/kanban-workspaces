// --- Drag-to-scroll for workspace-main (horizontal scroll of kanban-board) ---
(function() {
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  const main = document.querySelector('.workspace-main');
  const board = document.getElementById('kanbanBoard');
  if (!main || !board) return;

  // Only allow drag-to-scroll if mousedown is on empty main area (not on a card or column)
  main.addEventListener('mousedown', function(e) {
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
  main.addEventListener('mouseleave', function() {
    isDragging = false;
    main.classList.remove('drag-scroll-active');
    document.body.style.cursor = '';
  });
  main.addEventListener('mouseup', function() {
    isDragging = false;
    main.classList.remove('drag-scroll-active');
    document.body.style.cursor = '';
  });
  main.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    const x = e.pageX;
    board.scrollLeft = scrollLeft - (x - startX);
  });
  // Touch support
  let touchStartX = 0;
  let touchScrollLeft = 0;
  main.addEventListener('touchstart', function(e) {
    if (e.target.closest('.kanban-column, .kanban-card')) return;
    isDragging = true;
    touchStartX = e.touches[0].pageX - board.scrollLeft;
    touchScrollLeft = board.scrollLeft;
  });
  main.addEventListener('touchend', function() {
    isDragging = false;
  });
  main.addEventListener('touchmove', function(e) {
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
    }
    this.ui = {
      draggedCard: null,
      draggedElement: null,
      dropZone: null,
      theme: "auto",
      selectedCards: new Set(),
      isMultiSelectMode: false,
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
    theme: "auto",
    animations: true,
    mockData: false,
  }

  // Initialize the workspace board
  init() {
    this.loadConfiguration()
    this.setupEventListeners()
    this.initializeTheme()
    this.loadData()
    this.render()
    this.emit("board:initialized", this)
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

    // Workspace selector
    const workspaceSelector = document.getElementById("workspaceSelector")
    if (workspaceSelector) {
      workspaceSelector.addEventListener("change", (e) => {
        this.switchWorkspace(e.target.value)
      })
    }

    // Create workspace button
    const createWorkspaceBtn = document.getElementById("createWorkspaceBtn")
    if (createWorkspaceBtn) {
      createWorkspaceBtn.addEventListener("click", () => {
        this.openWorkspaceModal()
      })
    }

    // Filter toggle
    const filterToggle = document.getElementById("filterToggle")
    if (filterToggle) {
      filterToggle.addEventListener("click", () => {
        this.toggleFilters()
      })
    }

    // Theme toggle
    const themeToggle = document.getElementById("themeToggle")
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        this.toggleTheme()
      })
    }

    // Modal events
    this.setupModalEvents()

    // Keyboard shortcuts - FIXED
    this.setupKeyboardShortcuts()

    // Bulk operations
    this.setupBulkOperations()

    // Window events
    window.addEventListener(
      "resize",
      this.debounce((e) => {
        this.handleResize()
      }, 250),
    )

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
    const tabBtns = document.querySelectorAll(".modal-container:not(#stageSettingsModal) .tab-btn")
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchModalTab(e.target.dataset.tab)
      })
    })

    // Workspace modal
    const workspaceModal = document.getElementById("workspaceModal")
    const closeWorkspaceModal = document.getElementById("closeWorkspaceModal")
    const cancelWorkspaceBtn = document.getElementById("cancelWorkspaceBtn")
    const saveWorkspaceBtn = document.getElementById("saveWorkspaceBtn")

    if (closeWorkspaceModal) {
      closeWorkspaceModal.addEventListener("click", () => this.closeWorkspaceModal())
    }
    if (cancelWorkspaceBtn) {
      cancelWorkspaceBtn.addEventListener("click", () => this.closeWorkspaceModal())
    }
    if (saveWorkspaceBtn) {
      saveWorkspaceBtn.addEventListener("click", () => this.saveWorkspace())
    }

    // Stage Settings Modal (NEW)
    const stageSettingsModal = document.getElementById("stageSettingsModal")
    const closeStageSettingsModal = document.getElementById("closeStageSettingsModal")
    const cancelStageSettingsBtn = document.getElementById("cancelStageSettingsBtn")
    const saveStageSettingsBtn = document.getElementById("saveStageSettingsBtn")

    if (closeStageSettingsModal) {
      closeStageSettingsModal.addEventListener("click", () => this.closeStageSettingsModal())
    }
    if (cancelStageSettingsBtn) {
      cancelStageSettingsBtn.addEventListener("click", () => this.closeStageSettingsModal())
    }
    if (saveStageSettingsBtn) {
      saveStageSettingsBtn.addEventListener("click", () => this.saveStageSettings())
    }

    // Close modals on overlay click
    if (previewModal) {
      previewModal.addEventListener("click", (e) => {
        if (e.target === previewModal) {
          this.closePreviewModal()
        }
      })
    }

    if (workspaceModal) {
      workspaceModal.addEventListener("click", (e) => {
        if (e.target === workspaceModal) {
          this.closeWorkspaceModal()
        }
      })
    }
    if (stageSettingsModal) {
      stageSettingsModal.addEventListener("click", (e) => {
        if (e.target === stageSettingsModal) {
          this.closeStageSettingsModal()
        }
      })
    }

    // Setup workspace modal tabs
    this.setupWorkspaceModalTabs()
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

  // Setup bulk operations - FIXED
  setupBulkOperations() {
    const bulkActionsBar = document.getElementById("bulkActionsBar")
    const selectedCount = document.getElementById("selectedCount")
    const clearSelectionBtn = document.getElementById("clearSelectionBtn")
    const bulkMoveBtn = document.getElementById("bulkMoveBtn")
    const bulkAssignBtn = document.getElementById("bulkAssignBtn")
    const bulkDeleteBtn = document.getElementById("bulkDeleteBtn")

    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener("click", () => {
        this.clearSelection()
      })
    }

    if (bulkMoveBtn) {
      bulkMoveBtn.addEventListener("click", () => {
        this.showBulkMoveDialog()
      })
    }

    if (bulkAssignBtn) {
      bulkAssignBtn.addEventListener("click", () => {
        this.showBulkAssignDialog()
      })
    }

    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener("click", () => {
        this.bulkDeleteCards()
      })
    }
  }

  // Setup workspace modal tabs
  setupWorkspaceModalTabs() {
    // Add user buttons
    const addUserBtns = document.querySelectorAll(".add-user-btn")
    addUserBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.target.dataset.target
        this.showUserSelectionDropdown(btn, target)
      })
    })

    // Add stage button
    const addStageBtn = document.getElementById("addStageBtn")
    if (addStageBtn) {
      addStageBtn.addEventListener("click", () => {
        this.addStageToModal()
      })
    }
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

    // Workspace events
    this.on("workspace:switch", (oldWorkspace, newWorkspace) => {
      this.handleWorkspaceSwitch(oldWorkspace, newWorkspace)
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

    // User assignment events
    this.on("user:assign", (cardId, userId, stageId) => {
      this.handleUserAssignment(cardId, userId, stageId)
    })

    this.on("user:unassign", (cardId, userId) => {
      this.handleUserUnassignment(cardId, userId)
    })

    // Stage user assignment events (NEW)
    this.on("stage:user:assign", (stageId, userId) => {
      this.handleStageUserAssignment(stageId, userId, "assign")
    })
    this.on("stage:user:unassign", (stageId, userId) => {
      this.handleStageUserAssignment(stageId, userId, "unassign")
    })
  }

  // Initialize theme system
  initializeTheme() {
    const savedTheme = localStorage.getItem("workspace-theme") || this.options.theme
    this.setTheme(savedTheme)
  }

  // Load data from API or mock data
  loadData() {
    if (this.options.mockData && window.WorkspaceConfig && window.WorkspaceConfig.mockData) {
      this.data.cards = [...window.WorkspaceConfig.mockData.cards]
      this.emit("data:loaded", this.data)
      return
    }

    this.showLoading()
    this.fetchData()
      .then((data) => {
        this.data.cards = data.cards || []
        console.log('Loaded cards from API:', this.data.cards);
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
    const url = `${this.options.getDataApiUrl}`;
    const payload = {
      action: "RemoteServer",
      method: "getWorkspaceInfos",
      data: [{
        id: 1,
        depth: 1,
        language: 'all',
        limit: 30,
        query: '',
        start: 0,
        filterTxt: '',
      }]
    };

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload)
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    }).then((apiResponse) => {
    // Convert the TYPO3 workspace data to kanban cards
    const cards = this.convertWorkspaceDataToCards(apiResponse);
    
    console.log('Converted workspace data to cards:', cards);
    
    return {
      cards: cards,
      total: apiResponse[0]?.result?.total || cards.length
    };
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
    let editor = 'Unknown Editor';
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
      language: item.language ? item.language.title_crop.toLowerCase().substring(0, 2) : 'en',
      priority: priority,
      hasSchedule: false, // TYPO3 workspace doesn't have built-in scheduling
      scheduleText: item.stage === -10 ? 'Published' : null,
      comments: 0, // Would need separate API call to get comments
      assignedUsers: [], // Would need separate API call to get assigned users
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

  // Render the entire board
  render() {
    this.renderBoard()
    this.renderFilters()
    this.updateUI()
    this.emit("board:rendered", this)
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

    // Setup user assignment for all cards
    this.setupAllUserAssignments()

    // Update bulk actions visibility
    this.updateBulkActionsVisibility()
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

    const totalCardsInStage = this.data.cards.filter((card) => card.stage === stage.id).length
    const progressPercentage = totalCardsInStage > 0 ? Math.round((cardsForStage.length / totalCardsInStage) * 100) : 0

    // Get assigned users for this stage
    const stageUsers = this.getStageAssignedUsers(stage.id)
    const stageUsersHTML = this.generateStageUsersHTML(stage.id, stageUsers)

    column.innerHTML = `
       <div class="column-header">
           <div class="column-title-row">
               <div class="column-title-main">
                   <div class="stage-indicator" style="background-color: ${stage.color || 'var(--typo3-orange)'}"></div>
                   <span class="column-name">${this.escapeHtml(stage.label)}</span>
                   <span class="column-count">${cardsForStage.length}</span>
               </div>
               <div class="column-actions">
                   <button class="column-action" title="Assign users to stage" data-action="assign-users" data-stage-id="${stage.id}">
                       <i class="fas fa-user-plus"></i>
                   </button>
                   <button class="column-action" title="Sort items" data-action="sort" data-stage-id="${stage.id}">
                       <i class="fas fa-sort"></i>
                   </button>
                   <button class="column-action" title="More options" data-action="more" data-stage-id="${stage.id}">
                       <i class="fas fa-ellipsis-h"></i>
                   </button>
               </div>
           </div>
           ${stageUsersHTML}
           <div class="column-meta column-stats">
               <div class="stat-item">
                   <i class="fas fa-tasks"></i>
                   <span>${totalCardsInStage} total</span>
               </div>
               <div class="stat-item">
                   <i class="fas fa-clock"></i>
                   <span>${cardsForStage.filter((c) => c.hasSchedule).length} scheduled</span>
               </div>
               <div class="completion-indicator">
                   <span class="completion-text">${progressPercentage}% progress</span>
                   <div class="completion-bar">
                       <div class="completion-fill" style="width: ${progressPercentage}%"></div>
                   </div>
               </div>
           </div>
       </div>
       <div class="column-content" data-stage-id="${stage.id}">
           ${
             cardsForStage.length === 0
               ? '<div class="column-empty">No items in this stage</div>'
               : cardsForStage.map((card) => this.createCardHTML(card)).join("")
           }
       </div>
     `

    // Add event listeners for enhanced column actions
    this.setupColumnActions(column, stage)

    return column
  }

  // Setup enhanced column actions
  setupColumnActions(column, stage) {
    const actionButtons = column.querySelectorAll(".column-action")
    actionButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation()
        const action = button.dataset.action

        switch (action) {
          case "add-item":
            this.showAddItemDialog(stage.id)
            break
          case "assign-users":
            this.showStageUserAssignment(stage.id, button)
            break
          case "sort":
            this.toggleColumnSort(stage.id, "modifiedDate") // Toggle sort by modifiedDate
            break
          case "more":
            this.showColumnContextMenu(button, stage)
            break
        }
      })
    })

    // Setup user assignment for cards in this column
    this.setupColumnUserAssignment(column, stage)

    // Add event listener for user avatars in column header
    const stageUserAvatars = column.querySelectorAll(".column-header .user-avatar")
    stageUserAvatars.forEach((avatar) => {
      if (avatar.dataset.userId) {
        avatar.addEventListener("click", (e) => {
          e.stopPropagation()
          const userId = avatar.dataset.userId
          this.toggleColumnUserFilter(stage.id, userId, avatar) // Pass avatar for active class
        })
      }
    })
  }

  // Create card HTML
  createCardHTML(card) {
    const typeIcon = this.getTypeIcon(card.type)
    const formattedDate = this.formatDate(card.modifiedDate)
    const priorityClass = card.priority ? `priority-${card.priority}` : ""
    const selectedClass = this.ui.selectedCards.has(card.id) ? "selected" : ""

    // Generate assigned users HTML
    const assignedUsersHTML = this.generateAssignedUsersHTML(card)

    // Generate priority indicator
    const priorityHTML = card.priority
      ? `<div class="card-priority priority-${card.priority}">
           <i class="fas fa-flag"></i>
           <span>${card.priority}</span>
         </div>`
      : ""

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

    return `
       <div class="kanban-card ${priorityClass} ${selectedClass}" 
            data-card-id="${card.id}" 
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
                   ${priorityHTML}
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
                   <span class="card-editor">${this.escapeHtml(card.editor)}</span>
                   <span class="card-date">${formattedDate}</span>
               </div>
           </div>
           
           <div class="card-badges">
               ${
                 card.hasSchedule
                   ? `<span class="card-badge schedule">
                       <i class="fas fa-clock"></i>
                       ${card.scheduleText}
                   </span>`
                   : ""
               }
               ${dueDateHTML}
           </div>
           
           ${assignedUsersHTML}
           
           <div class="card-footer">
               <div class="card-language">
                   ${this.getLanguageFlag(card.language)} ${card.language.toUpperCase()}
               </div>
               <div class="card-stats">
                   ${
                     card.comments > 0
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

  // Generate assigned users HTML for card footer
  generateAssignedUsersHTML(card) {
    if (!card.assignedUsers || card.assignedUsers.length === 0) {
      return `
         <div class="card-assignees">
           <div class="user-avatar add-user" title="Assign user" data-card-id="${card.id}">
             <i class="fas fa-plus"></i>
           </div>
         </div>
       `
    }

    const maxVisible = 3
    const visibleUsers = card.assignedUsers.slice(0, maxVisible)
    const remainingCount = card.assignedUsers.length - maxVisible

    let html = '<div class="card-assignees">'

    visibleUsers.forEach((userId, index) => {
      const user = this.getUserById(userId)
      if (user) {
        html += `
           <div class="user-avatar ${index > 0 ? "multiple" : ""}" 
                title="${user.name} (${user.role})"
                data-user-id="${userId}"
                data-card-id="${card.id}">
             ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : this.getInitials(user.name)}
           </div>
         `
      }
    })

    if (remainingCount > 0) {
      html += `
         <div class="user-avatar multiple" title="${remainingCount} more users">
           +${remainingCount}
         </div>
       `
    }

    html += `
       <div class="user-avatar add-user" title="Assign user" data-card-id="${card.id}">
         <i class="fas fa-plus"></i>
       </div>
     `

    html += "</div>"
    return html
  }

  // Generate assigned users HTML for stage header
  generateStageUsersHTML(stageId, userIds) {
    if (!userIds || userIds.length === 0) return ""

    const maxVisible = 4
    const visibleUsers = userIds.slice(0, maxVisible)
    const remainingCount = userIds.length - maxVisible
    const activeUserId = this.data.columnUserFilters[stageId]

    let html = '<div class="user-avatars">'

    visibleUsers.forEach((userId) => {
      const user = this.getUserById(userId)
      if (user) {
        const activeClass = activeUserId === userId ? "active" : ""
        html += `
           <div class="user-avatar ${activeClass}" title="${user.name} - ${user.role}" data-user-id="${user.id}" data-stage-id="${stageId}">
             ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : this.getInitials(user.name)}
           </div>
         `
      }
    })

    if (remainingCount > 0) {
      html += `
         <div class="user-avatar" title="${remainingCount} more users">
           +${remainingCount}
         </div>
       `
    }

    html += "</div>"
    return html
  }

  // NEW: Toggle column-specific user filter
  toggleColumnUserFilter(stageId, userId, avatarElement) {
    const currentFilter = this.data.columnUserFilters[stageId]

    if (currentFilter === userId) {
      // If already filtered by this user, toggle off
      this.data.columnUserFilters[stageId] = null
      this.showToast(`Filter reset for ${this.getStageById(stageId).label}`, "info")
    } else {
      // Apply filter for this user
      this.data.columnUserFilters[stageId] = userId
      this.showToast(
        `Showing cards for ${this.getUserById(userId).name} in ${this.getStageById(stageId).label}`,
        "info",
      )
    }

    this.renderBoard() // Re-render to apply the filter and update avatar active state
  }

  // Show user assignment dropdown for a stage
  showStageUserAssignment(stageId, triggerElement) {
    const stage = this.getStageById(stageId)
    if (!stage) return

    const existingDropdown = document.querySelector(".user-assignment-dropdown")
    if (existingDropdown) {
      existingDropdown.remove()
    }

    const dropdown = this.createStageUserAssignmentDropdown(stageId, this.getStageAssignedUsers(stageId))

    const rect = triggerElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    dropdown.style.position = "fixed"
    dropdown.style.zIndex = "9999"

    if (rect.bottom + dropdown.offsetHeight + 10 > viewportHeight) {
      dropdown.style.bottom = viewportHeight - rect.top + 5 + "px"
    } else {
      dropdown.style.top = rect.bottom + 5 + "px"
    }

    if (rect.left + dropdown.offsetWidth > viewportWidth) {
      dropdown.style.right = viewportWidth - rect.right + "px"
    } else {
      dropdown.style.left = rect.left + "px"
    }

    document.body.appendChild(dropdown)

    const closeHandler = (e) => {
      if (!dropdown.contains(e.target) && !triggerElement.contains(e.target)) {
        dropdown.remove()
        document.removeEventListener("click", closeHandler)
        document.removeEventListener("touchstart", closeHandler)
      }
    }

    setTimeout(() => {
      document.addEventListener("click", closeHandler)
      document.addEventListener("touchstart", closeHandler)
    }, 100)
  }

  createStageUserAssignmentDropdown(stageId, assignedUserIds) {
    const dropdown = document.createElement("div")
    dropdown.className = "user-assignment-dropdown"

    const users = window.WorkspaceConfig?.users || []

    dropdown.innerHTML = users
      .map(
        (user) => `
      <div class="user-option ${assignedUserIds.includes(user.id) ? "assigned" : ""}" 
           data-user-id="${user.id}" 
           data-stage-id="${stageId}">
        <div class="user-avatar">
          ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : this.getInitials(user.name)}
        </div>
        <div class="user-info">
          <div class="user-name">${this.escapeHtml(user.name)}</div>
          <div class="user-role">${this.escapeHtml(user.role)}</div>
        </div>
        <div class="assignment-status">
          ${assignedUserIds.includes(user.id) ? '<i class="fas fa-check"></i>' : ""}
        </div>
      </div>
    `,
      )
      .join("")

    dropdown.addEventListener("click", (e) => {
      e.stopPropagation()
      const userOption = e.target.closest(".user-option")
      if (userOption) {
        const userId = userOption.dataset.userId
        const stageId = userOption.dataset.stageId
        const isAssigned = userOption.classList.contains("assigned")

        if (isAssigned) {
          this.emit("stage:user:unassign", stageId, userId)
        } else {
          this.emit("stage:user:assign", stageId, userId)
        }

        dropdown.remove()
      }
    })

    return dropdown
  }

  handleStageUserAssignment(stageId, userId, action) {
    const stageAssignments = window.WorkspaceConfig.stageAssignments
    if (!stageAssignments[stageId]) {
      stageAssignments[stageId] = []
    }

    const currentAssignments = stageAssignments[stageId]
    const user = this.getUserById(userId)

    if (action === "assign") {
      if (!currentAssignments.includes(userId)) {
        currentAssignments.push(userId)
        this.showToast(`${user.name} assigned to ${this.getStageById(stageId).label} stage`, "success")
      }
    } else if (action === "unassign") {
      const index = currentAssignments.indexOf(userId)
      if (index > -1) {
        currentAssignments.splice(index, 1)
        this.showToast(`${user.name} unassigned from ${this.getStageById(stageId).label} stage`, "info")
      }
    }
    this.renderBoard() // Re-render to update stage header
    // In a real application, you would make an API call here to save changes
    this.saveStageAssignmentToServer(stageId, userId, action)
  }

  saveStageAssignmentToServer(stageId, userId, action) {
    console.log(`Mock API call: ${action} user ${userId} to stage ${stageId}`)
    // Example: fetch(`${this.options.apiUrl}/stages/${stageId}/assign`, { method: 'POST', body: JSON.stringify({ userId, action }) });
  }

  // NEW: Toggle sort for a specific column
  toggleColumnSort(stageId, sortBy) {
    const currentSort = this.data.columnSorts[stageId]

    if (currentSort === sortBy) {
      // If already sorted by this, toggle off
      this.data.columnSorts[stageId] = null
      this.showToast(`Sort reset for ${this.getStageById(stageId).label}`, "info")
    } else {
      // Apply sort
      this.data.columnSorts[stageId] = sortBy
      this.showToast(`Cards in ${this.getStageById(stageId).label} sorted by ${sortBy}`, "info")
    }
    this.renderBoard() // Re-render to apply the sort
  }

  // Show context menu for column actions
  showColumnContextMenu(triggerElement, stage) {
    // Remove any existing menu
    const existingMenu = document.querySelector(".context-menu")
    if (existingMenu) existingMenu.remove()

    // Build menu HTML (adapted from v2)
    const menu = document.createElement("div")
    menu.className = "context-menu stage-context-menu"
    menu.innerHTML = `
      <div class="context-menu-header">
        <i class="fas fa-cog"></i>
        <span>Stage Options</span>
      </div>
      <div class="context-menu-item" data-action="edit-stage" data-stage-id="${stage.id}">
        <i class="fas fa-edit"></i>
        <span>Edit Stage Settings</span>
      </div>
      <div class="context-menu-item" data-action="assign-users" data-stage-id="${stage.id}">
        <i class="fas fa-user-plus"></i>
        <span>Manage Users</span>
      </div>
      <div class="context-menu-item" data-action="export-stage" data-stage-id="${stage.id}">
        <i class="fas fa-download"></i>
        <span>Export Stage Data</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="clear-stage" data-stage-id="${stage.id}">
        <i class="fas fa-trash-alt"></i>
        <span>Clear All Items</span>
      </div>
      <div class="context-menu-item" data-action="archive-stage" data-stage-id="${stage.id}">
        <i class="fas fa-archive"></i>
        <span>Archive Stage</span>
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item danger" data-action="delete-stage" data-stage-id="${stage.id}">
        <i class="fas fa-trash"></i>
        <span>Delete Stage</span>
      </div>
    `

    document.body.appendChild(menu)

    // Position menu (fixed, below trigger)
    const rect = triggerElement.getBoundingClientRect()
    menu.style.position = "fixed"
    menu.style.left = `${rect.left}px`
    menu.style.top = `${rect.bottom + 5}px`

    // Click handler for menu actions
    const handleMenuClick = (e) => {
      const menuItem = e.target.closest(".context-menu-item")
      if (menuItem) {
        const action = menuItem.dataset.action
        this.handleColumnContextMenuAction(action, stage)
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

  // Handle actions from column context menu
  handleColumnContextMenuAction(action, stage) {
    switch (action) {
      case "edit-stage":
        this.openStageSettingsModal(stage.id)
        break
      case "assign-users":
        this.showStageUserAssignment(stage.id)
        break
      case "export-stage":
        this.exportStageData(stage.id)
        break
      case "clear-stage":
        this.clearStageItems(stage.id)
        break
      case "archive-stage":
        this.archiveStage(stage.id)
        break
      case "delete-stage":
        this.deleteStage(stage.id)
        break
      default:
        console.log(`Unhandled column action: ${action} for stage ${stage.id}`)
    }
  }

  // Open stage settings modal
  openStageSettingsModal(stageId) {
    const modal = document.getElementById("stageSettingsModal")
    const stage = this.getStageById(stageId)

    if (!modal || !stage) {
      this.showToast("Stage not found.", "error")
      return
    }

    modal.dataset.editingStageId = stageId // Store for saving

    document.getElementById("stageSettingsModalTitle").textContent = `Edit Stage: ${stage.label}`
    document.getElementById("editStageId").value = stage.id
    document.getElementById("editStageLabel").value = stage.label
    document.getElementById("editStageColor").value = stage.color
    document.getElementById("editStageAllowEdit").checked = stage.allowEdit
    document.getElementById("editStageAllowDelete").checked = stage.allowDelete

    modal.style.display = "flex"
    document.body.style.overflow = "hidden"
    document.getElementById("editStageLabel").focus()
  }

  // Close stage settings modal
  closeStageSettingsModal() {
    const modal = document.getElementById("stageSettingsModal")
    if (modal) {
      modal.style.display = "none"
      document.body.style.overflow = ""
      delete modal.dataset.editingStageId
    }
  }

  // Save stage settings
  saveStageSettings() {
    const stageId = document.getElementById("stageSettingsModal").dataset.editingStageId
    const stage = this.getStageById(stageId)

    if (!stage) {
      this.showToast("Error: Stage not found for saving.", "error")
      return
    }

    const updatedLabel = document.getElementById("editStageLabel").value.trim()
    if (!updatedLabel) {
      this.showToast("Stage name cannot be empty.", "error")
      document.getElementById("editStageLabel").focus()
      return
    }

    stage.label = updatedLabel
    stage.color = document.getElementById("editStageColor").value
    stage.allowEdit = document.getElementById("editStageAllowEdit").checked
    stage.allowDelete = document.getElementById("editStageAllowDelete").checked

    // In a real app, send to API
    this.showLoading()
    fetch(`${this.options.apiUrl}/stages/${stage.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(stage),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((result) => {
        if (result.success) {
          this.showToast(`Stage "${stage.label}" updated successfully`, "success")
          this.renderBoard() // Re-render to show updated stage name/color
          this.closeStageSettingsModal()
        } else {
          throw new Error(result.message || "Failed to update stage")
        }
      })
      .catch((error) => {
        console.error("Failed to save stage settings:", error)
        this.showToast("Failed to save stage settings", "error")
      })
      .finally(() => {
        this.hideLoading()
      })
  }

  // Delete a stage
  deleteStage(stageId) {
    const stage = this.getStageById(stageId)
    if (!stage) return

    if (
      !confirm(`Are you sure you want to delete the stage "${stage.label}" and all its cards? This cannot be undone.`)
    ) {
      return
    }

    // Remove stage from data
    this.data.stages = this.data.stages.filter((s) => s.id !== stageId)
    // Remove cards belonging to this stage
    this.data.cards = this.data.cards.filter((card) => card.stage !== stageId)

    // In a real app, send to API
    this.showLoading()
    fetch(`${this.options.apiUrl}/stages/${stage.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((result) => {
        if (result.success) {
          this.showToast(`Stage "${stage.label}" deleted successfully`, "success")
          this.renderBoard() // Re-render the entire board
        } else {
          throw new Error(result.message || "Failed to delete stage")
        }
      })
      .catch((error) => {
        console.error("Failed to delete stage:", error)
        this.showToast("Failed to delete stage", "error")
      })
      .finally(() => {
        this.hideLoading()
      })
  }

  // Bulk operations methods
  toggleCardSelection(cardId) {
    if (this.ui.selectedCards.has(cardId)) {
      this.ui.selectedCards.delete(cardId)
    } else {
      this.ui.selectedCards.add(cardId)
    }

    this.updateCardSelectionUI()
    this.updateBulkActionsVisibility()
  }

  updateCardSelectionUI() {
    document.querySelectorAll(".kanban-card").forEach((cardEl) => {
      const cardId = cardEl.dataset.cardId
      cardEl.classList.toggle("selected", this.ui.selectedCards.has(cardId))
    })
  }

  updateBulkActionsVisibility() {
    const bulkActionsBar = document.getElementById("bulkActionsBar")
    const selectedCount = document.getElementById("selectedCount")

    if (bulkActionsBar && selectedCount) {
      const count = this.ui.selectedCards.size
      selectedCount.textContent = count

      if (count > 0) {
        bulkActionsBar.style.display = "block"
      } else {
        bulkActionsBar.style.display = "none"
      }
    }
  }

  clearSelection() {
    this.ui.selectedCards.clear()
    this.ui.isMultiSelectMode = false
    document.body.classList.remove("multi-select-mode")
    this.updateCardSelectionUI()
    this.updateBulkActionsVisibility()
  }

  showBulkMoveDialog() {
    const selectedCards = Array.from(this.ui.selectedCards)
    if (selectedCards.length === 0) return

    // Create a simple stage selection dialog
    const stages = this.data.stages
    const stageOptions = stages
      .map((stage) => `<option value="${stage.id}">${this.escapeHtml(stage.label)}</option>`)
      .join("")

    const dialog = document.createElement("div")
    dialog.className = "modal-overlay"
    dialog.innerHTML = `
       <div class="modal-container" style="width: 400px;">
         <div class="modal-header">
           <h2 class="modal-title">Move ${selectedCards.length} items</h2>
           <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
             <i class="fas fa-times"></i>
           </button>
         </div>
         <div class="modal-content" style="padding: var(--spacing-lg);">
           <div class="form-group">
             <label for="targetStage">Select target stage:</label>
             <select id="targetStage" class="form-input">
               ${stageOptions}
             </select>
           </div>
         </div>
         <div class="modal-footer">
           <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
           <button class="btn btn-primary" onclick="workspaceBoard.executeBulkMove()">Move Items</button>
         </div>
       </div>
     `

    document.body.appendChild(dialog)
  }

  executeBulkMove() {
    const targetStageSelect = document.getElementById("targetStage")
    const targetStageId = targetStageSelect.value
    const selectedCards = Array.from(this.ui.selectedCards)

    const originalStages = {}
    selectedCards.forEach((cardId) => {
      const card = this.getCardById(cardId)
      if (card) originalStages[cardId] = card.stage
      this.moveCard(cardId, targetStageId)
    })

    this.addToHistory({
      type: "bulk_move",
      cardIds: selectedCards,
      targetStage: targetStageId,
      originalStages: originalStages, // Store original stages for undo
      timestamp: Date.now(),
    })

    this.clearSelection()
    document.querySelector(".modal-overlay").remove()
    this.showToast(`Moved ${selectedCards.length} items to ${this.getStageById(targetStageId).label}`, "success")
  }

  showBulkAssignDialog() {
    const selectedCards = Array.from(this.ui.selectedCards)
    if (selectedCards.length === 0) return

    const users = window.WorkspaceConfig?.users || []
    const userOptions = users
      .map(
        (user) => `
          <div class="user-option" data-user-id="${user.id}">
              <div class="user-avatar">
                  ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : this.getInitials(user.name)}
              </div>
              <div class="user-info">
                  <div class="user-name">${user.name}</div>
                  <div class="user-role">${user.role}</div>
              </div>
              <input type="checkbox" id="bulkAssignUser-${user.id}" data-user-id="${user.id}">
          </div>
      `,
      )
      .join("")

    const dialog = document.createElement("div")
    dialog.className = "modal-overlay"
    dialog.innerHTML = `
          <div class="modal-container" style="width: 500px;">
              <div class="modal-header">
                  <h2 class="modal-title">Assign Users to ${selectedCards.length} items</h2>
                  <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                      <i class="fas fa-times"></i>
                  </button>
              </div>
              <div class="modal-content" style="padding: var(--spacing-lg);">
                  <div class="form-group">
                      <label>Select users to assign:</label>
                      <div class="user-selection-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm);">
                          ${userOptions}
                      </div>
                  </div>
              </div>
              <div class="modal-footer">
                  <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                  <button class="btn btn-primary" onclick="workspaceBoard.executeBulkAssign()">Assign Users</button>
              </div>
          </div>
      `

    document.body.appendChild(dialog)
  }

  executeBulkAssign() {
    const selectedUsers = Array.from(document.querySelectorAll('#bulkAssignUser input[type="checkbox"]:checked')).map(
      (cb) => cb.dataset.userId,
    )
    const selectedCards = Array.from(this.ui.selectedCards)

    if (selectedUsers.length === 0) {
      this.showToast("Please select at least one user to assign.", "warning")
      return
    }

    const assignmentsMade = {} // Track assignments for undo
    selectedCards.forEach((cardId) => {
      const card = this.getCardById(cardId)
      if (card) {
        // Store original assignments if exists
        assignmentsMade[cardId] = [...(card.assignedUsers || [])]
        card.assignedUsers = Array.from(new Set([...(card.assignedUsers || []), ...selectedUsers]))
        this.saveUserAssignment(cardId, selectedUsers, "bulk_assign") // Mock API call
      }
    })

    this.addToHistory({
      type: "bulk_assign",
      cardIds: selectedCards,
      users: selectedUsers,
      originalAssignments: assignmentsMade,
      timestamp: Date.now(),
    })

    this.clearSelection()
    document.querySelector(".modal-overlay").remove()
    this.renderBoard() // Re-render to show updated assignments
    this.showToast(`Assigned ${selectedUsers.length} users to ${selectedCards.length} items`, "success")
  }

  bulkDeleteCards() {
    const selectedCards = Array.from(this.ui.selectedCards)
    if (selectedCards.length === 0) return

    if (confirm(`Are you sure you want to delete ${selectedCards.length} items?`)) {
      // Store original state for undo
      const originalCards = selectedCards.map((cardId) => this.getCardById(cardId)).filter(Boolean)

      selectedCards.forEach((cardId) => {
        this.data.cards = this.data.cards.filter((card) => card.id !== cardId)
        // Mock API call to delete
        // fetch(`${this.options.apiUrl}/cards/${cardId}`, { method: 'DELETE' });
      })

      this.addToHistory({
        type: "bulk_delete",
        cardIds: selectedCards,
        deletedCardsData: originalCards, // Store data to restore on undo
        timestamp: Date.now(),
      })

      this.clearSelection()
      this.renderBoard()
      this.showToast(`Deleted ${selectedCards.length} items`, "success")
    }
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

  // Workspace management methods
  openWorkspaceModal(workspaceId = null) {
    const modal = document.getElementById("workspaceModal")
    const title = document.getElementById("workspaceModalTitle")

    if (workspaceId) {
      title.textContent = "Edit Workspace"
      this.loadWorkspaceData(workspaceId)
    } else {
      title.textContent = "Create New Workspace"
      this.resetWorkspaceForm()
    }

    modal.style.display = "flex"
    document.body.style.overflow = "hidden"

    // Focus first input
    const firstInput = modal.querySelector("input")
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100)
    }
  }

  closeWorkspaceModal() {
    const modal = document.getElementById("workspaceModal")
    if (modal) {
      modal.style.display = "none"
      document.body.style.overflow = ""
    }
  }

  resetWorkspaceForm() {
    // Reset all form fields
    document.getElementById("workspaceTitle").value = ""
    document.getElementById("workspaceDescription").value = ""
    document.getElementById("sendNotifications").checked = false
    document.getElementById("freezeEditing").checked = false
    document.getElementById("liveEditing").checked = false
    document.getElementById("allowLiveEdit").checked = false
    document.getElementById("allowPublishAll").checked = false
    document.getElementById("allowSwapMode").checked = false
    document.getElementById("dbMountPoints").value = ""
    document.getElementById("fileMountPoints").value = ""
    document.getElementById("emailNotifications").checked = false
    document.getElementById("notifyOwners").checked = false
    document.getElementById("notifyMembers").checked = false
    document.getElementById("customNotificationText").value = ""

    // Clear selected users
    document.getElementById("selectedOwners").innerHTML = ""
    document.getElementById("selectedMembers").innerHTML = ""

    // Reset stages list (shows default stages for new workspace)
    this.renderWorkspaceStages(window.WorkspaceConfig.stages)
  }

  loadWorkspaceData(workspaceId) {
    // In a real implementation, this would fetch from API
    // For now, we'll use mock data
    const mockWorkspace = {
      id: workspaceId,
      title: "Sample Workspace",
      description: "Sample workspace description",
      sendNotifications: true,
      owners: ["john", "jane"],
      members: ["mike", "sarah"],
      // For 'Internal Stages' tab, we're assuming it modifies the global stages for now
      // A more complex app would have workspace-specific stages
      stages: [...this.data.stages],
      freezeEditing: false,
      liveEditing: true,
      allowLiveEdit: true,
      allowPublishAll: false,
      allowSwapMode: true,
      dbMountPoints: "/var/www/site",
      fileMountPoints: "/fileadmin",
      emailNotifications: true,
      notifyOwners: true,
      notifyMembers: false,
      customNotificationText: "Content update for review.",
    }

    // Populate form with data
    document.getElementById("workspaceTitle").value = mockWorkspace.title
    document.getElementById("workspaceDescription").value = mockWorkspace.description
    document.getElementById("sendNotifications").checked = mockWorkspace.sendNotifications
    document.getElementById("freezeEditing").checked = mockWorkspace.freezeEditing
    document.getElementById("liveEditing").checked = mockWorkspace.liveEditing
    document.getElementById("allowLiveEdit").checked = mockWorkspace.allowLiveEdit
    document.getElementById("allowPublishAll").checked = mockWorkspace.allowPublishAll
    document.getElementById("allowSwapMode").checked = mockWorkspace.allowSwapMode
    document.getElementById("dbMountPoints").value = mockWorkspace.dbMountPoints
    document.getElementById("fileMountPoints").value = mockWorkspace.fileMountPoints
    document.getElementById("emailNotifications").checked = mockWorkspace.emailNotifications
    document.getElementById("notifyOwners").checked = mockWorkspace.notifyOwners
    document.getElementById("notifyMembers").checked = mockWorkspace.notifyMembers
    document.getElementById("customNotificationText").value = mockWorkspace.customNotificationText

    // Load users
    this.loadSelectedUsers("owners", mockWorkspace.owners)
    this.loadSelectedUsers("members", mockWorkspace.members)

    // Load stages
    this.renderWorkspaceStages(mockWorkspace.stages)

    // Populate notification stages checkboxes
    const notificationStagesContainer = document.getElementById("notificationStages")
    notificationStagesContainer.innerHTML = "" // Clear previous
    this.data.stages.forEach((stage) => {
      const checkboxHtml = `
              <label class="checkbox-label">
                  <input type="checkbox" data-stage-id="${stage.id}" ${mockWorkspace.stages.some((s) => s.id === stage.id) ? "checked" : ""}>
                  <span class="checkmark"></span>
                  ${this.escapeHtml(stage.label)}
              </label>
          `
      notificationStagesContainer.insertAdjacentHTML("beforeend", checkboxHtml)
    })
  }

  loadSelectedUsers(type, userIds) {
    const container = document.getElementById(`selected${type.charAt(0).toUpperCase() + type.slice(1)}`)
    container.innerHTML = ""

    userIds.forEach((userId) => {
      const user = this.getUserById(userId)
      if (user) {
        const userElement = document.createElement("div")
        userElement.className = "selected-user"
        userElement.innerHTML = `
            <span>${this.escapeHtml(user.name)}</span>
            <button type="button" class="remove-user" data-user-id="${userId}" data-type="${type}">
              <i class="fas fa-times"></i>
            </button>
          `
        container.appendChild(userElement)

        // Add remove functionality
        userElement.querySelector(".remove-user").addEventListener("click", (e) => {
          userElement.remove()
        })
      }
    })
  }

  renderWorkspaceStages(stages) {
    const stagesList = document.getElementById("stagesList")
    stagesList.innerHTML = ""

    stages.forEach((stage, index) => {
      const stageElement = document.createElement("div")
      stageElement.className = "stage-config-item"
      stageElement.innerHTML = `
          <input type="text" placeholder="Stage name" value="${stage.label}" data-field="label">
          <input type="color" class="stage-color-picker" value="${stage.color}" data-field="color">
          <label class="checkbox-label">
            <input type="checkbox" ${stage.allowEdit ? "checked" : ""} data-field="allowEdit">
            <span class="checkmark"></span>
            Allow Edit
          </label>
          <label class="checkbox-label">
            <input type="checkbox" ${stage.allowDelete ? "checked" : ""} data-field="allowDelete">
            <span class="checkmark"></span>
            Allow Delete
          </label>
          <button type="button" class="stage-remove" data-index="${index}">
            <i class="fas fa-trash"></i>
          </button>
        `
      stagesList.appendChild(stageElement)

      // Add remove functionality
      stageElement.querySelector(".stage-remove").addEventListener("click", () => {
        stageElement.remove()
      })
    })
  }

  addStageToModal() {
    const newStage = {
      id: `stage_${Date.now()}`,
      label: "New Stage",
      color: "#007bff",
      order: this.data.stages.length + 1,
      allowEdit: true,
      allowDelete: true,
    }

    const stagesList = document.getElementById("stagesList")
    const stageElement = document.createElement("div")
    stageElement.className = "stage-config-item"
    stageElement.innerHTML = `
        <input type="text" placeholder="Stage name" value="${this.escapeHtml(newStage.label)}" data-field="label">
        <input type="color" class="stage-color-picker" value="${newStage.color}" data-field="color">
        <label class="checkbox-label">
          <input type="checkbox" ${newStage.allowEdit ? "checked" : ""} data-field="allowEdit">
          <span class="checkmark"></span>
          Allow Edit
        </label>
        <label class="checkbox-label">
          <input type="checkbox" ${newStage.allowDelete ? "checked" : ""} data-field="allowDelete">
          <span class="checkmark"></span>
          Allow Delete
        </label>
        <button type="button" class="stage-remove">
          <i class="fas fa-trash"></i>
        </button>
      `
    stagesList.appendChild(stageElement)

    // Add remove functionality
    stageElement.querySelector(".stage-remove").addEventListener("click", () => {
      stageElement.remove()
    })

    // Focus the new stage name input
    stageElement.querySelector('input[data-field="label"]').focus()
  }

  saveWorkspace() {
    const formData = this.collectWorkspaceFormData()

    if (!this.validateWorkspaceForm(formData)) {
      return
    }

    this.showLoading()

    // Create API endpoint call
    const url = `${this.options.apiUrl}/workspace`
    const method = formData.id ? "PUT" : "POST"

    fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((result) => {
        if (result.success) {
          this.showToast(formData.id ? "Workspace updated successfully" : "Workspace created successfully", "success")
          this.closeWorkspaceModal()
          this.refreshWorkspaceList()
        } else {
          throw new Error(result.message || "Failed to save workspace")
        }
      })
      .catch((error) => {
        console.error("Failed to save workspace:", error)
        this.showToast("Failed to save workspace", "error")
      })
      .finally(() => {
        this.hideLoading()
      })
  }

  collectWorkspaceFormData() {
    const formData = {
      title: document.getElementById("workspaceTitle").value,
      description: document.getElementById("workspaceDescription").value,
      sendNotifications: document.getElementById("sendNotifications").checked,
      freezeEditing: document.getElementById("freezeEditing").checked,
      liveEditing: document.getElementById("liveEditing").checked,
      allowLiveEdit: document.getElementById("allowLiveEdit").checked,
      allowPublishAll: document.getElementById("allowPublishAll").checked,
      allowSwapMode: document.getElementById("allowSwapMode").checked,
      dbMountPoints: document.getElementById("dbMountPoints").value,
      fileMountPoints: document.getElementById("fileMountPoints").value,
      emailNotifications: document.getElementById("emailNotifications").checked,
      notifyOwners: document.getElementById("notifyOwners").checked,
      notifyMembers: document.getElementById("notifyMembers").checked,
      customNotificationText: document.getElementById("customNotificationText").value,
      owners: this.getSelectedUsers("owners"),
      members: this.getSelectedUsers("members"),
      stages: this.getConfiguredStages(),
      notificationStages: this.getNotificationStages(),
    }

    return formData
  }

  getSelectedUsers(type) {
    const container = document.getElementById(`selected${type.charAt(0).toUpperCase() + type.slice(1)}`)
    const userElements = container.querySelectorAll(".selected-user")
    return Array.from(userElements).map((el) => el.querySelector(".remove-user").dataset.userId)
  }

  getConfiguredStages() {
    const stageElements = document.querySelectorAll(".stage-config-item")
    return Array.from(stageElements).map((el, index) => ({
      id: `stage_${index}_${Date.now()}`, // Ensure unique ID for new stages
      label: el.querySelector('[data-field="label"]').value,
      color: el.querySelector('[data-field="color"]').value,
      allowEdit: el.querySelector('[data-field="allowEdit"]').checked,
      allowDelete: el.querySelector('[data-field="allowDelete"]').checked,
      order: index + 1,
    }))
  }

  getNotificationStages() {
    const notificationStageCheckboxes = document.querySelectorAll('#notificationStages input[type="checkbox"]:checked')
    return Array.from(notificationStageCheckboxes).map((cb) => cb.dataset.stageId)
  }

  validateWorkspaceForm(formData) {
    if (!formData.title.trim()) {
      this.showToast("Workspace title is required", "error")
      document.getElementById("workspaceTitle").focus()
      return false
    }

    if (formData.stages.length === 0) {
      this.showToast("At least one stage is required", "error")
      this.switchModalTab("stages")
      return false
    }

    return true
  }

  refreshWorkspaceList() {
    // Refresh the workspace selector
    const workspaceSelector = document.getElementById("workspaceSelector")
    // In a real implementation, this would fetch updated workspace list from API
    // For now, we'll just show a success message
    console.log("Workspace list refreshed")
  }

  // Get filtered cards (global filters only)
  getFilteredCards() {
    let cards = [...this.data.cards]

    // Apply search filter
    if (this.data.searchQuery && this.data.searchQuery.trim()) {
      const query = this.data.searchQuery.toLowerCase().trim()
      cards = cards.filter(
        (card) =>
          card.title.toLowerCase().includes(query) ||
          card.editor.toLowerCase().includes(query) ||
          card.pageName.toLowerCase().includes(query) ||
          card.uid.toString().includes(query) ||
          (card.tags && card.tags.some((tag) => tag.toLowerCase().includes(query))),
      )
    }

    // Apply active filters
    if (this.data.activeFilters && Object.keys(this.data.activeFilters).length > 0) {
      Object.entries(this.data.activeFilters).forEach(([filterType, filterValues]) => {
        if (filterValues && filterValues.length > 0) {
          cards = cards.filter((card) => {
            let cardValue

            switch (filterType) {
              case "contentType":
                cardValue = card.type
                break
              case "page":
                const pageMap = {
                  Home: "home",
                  Products: "products",
                  Contact: "contact",
                  News: "news",
                  About: "about",
                  Global: "global",
                }
                cardValue = pageMap[card.pageName] || card.pageName.toLowerCase()
                break
              case "editor":
                const editorMap = {
                  "John Doe": "john",
                  "Jane Smith": "jane",
                  "Mike Johnson": "mike",
                  "Sarah Wilson": "sarah",
                  "Tom Brown": "tom",
                }
                cardValue = editorMap[card.editor] || card.editorId
                break
              case "language":
                cardValue = card.language
                break
              case "assignedUsers":
                // Special handling for assignedUsers filter if needed in future
                // For now, editor filter also covers single user assignment from header
                return filterValues.some((val) => (card.assignedUsers || []).includes(val))
              default:
                cardValue = card[filterType]
            }

            return filterValues.includes(cardValue)
          })
        }
      })
    }

    return cards
  }

  // Setup drag and drop functionality
  setupDragAndDrop() {
    const cards = document.querySelectorAll(".kanban-card")
    const columns = document.querySelectorAll(".column-content")

    // Create drag placeholder
    this.createDragPlaceholder()

    // Setup card drag events
    cards.forEach((cardEl) => {
      const cardId = cardEl.dataset.cardId
      const cardData = this.getCardById(cardId)
      this.setupCardDragAndClick(cardEl, cardData)
      this.setupCardUserAssignment(cardEl)
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

          if (targetStage && sourceStage && targetStage.id !== sourceStage.id) {
            // Add to history before moving
            this.addToHistory({
              type: "move",
              cardId: cardId,
              from: sourceStage.id,
              to: targetStage.id,
              timestamp: Date.now(),
            })

            this.moveCard(cardId, stageId)
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

      if (cardData) {
        this.emit("card:click", cardData)
      }
    }

    cardEl.addEventListener("dragstart", cardEl._dragstartHandler)
    cardEl.addEventListener("dragend", cardEl._dragendHandler)
    cardEl.addEventListener("click", cardEl._clickHandler)
  }

  // Setup card user assignment
  setupCardUserAssignment(cardElement) {
    const cardId = cardElement.dataset.cardId

    // Remove previous listeners to prevent duplicates
    const oldAddUserHandler = cardElement._addUserHandler
    const oldRemoveUserHandler = cardElement._removeUserHandler
    if (oldAddUserHandler) cardElement.removeEventListener("click", oldAddUserHandler)
    if (oldRemoveUserHandler) cardElement.removeEventListener("click", oldRemoveUserHandler)

    const addUserHandler = (e) => {
      e.stopPropagation()
      const addUserBtn = e.target.closest(".add-user")
      if (addUserBtn) {
        this.showCardUserAssignment(cardId, addUserBtn)
        return
      }

      const userAvatar = e.target.closest(".user-avatar:not(.add-user)")
      if (userAvatar && userAvatar.dataset.userId) {
        const userId = userAvatar.dataset.userId
        const user = this.getUserById(userId)

        if (confirm(`Remove ${user?.name || "user"} from this card?`)) {
          this.emit("user:unassign", cardId, userId)
        }
        return
      }
    }

    cardElement.addEventListener("click", addUserHandler)
    cardElement._addUserHandler = addUserHandler // Store for removal

    // Listener for removing user (specific to avatar clicks, not + button)
    const removeUserHandler = (e) => {
      const userAvatar = e.target.closest(".user-avatar:not(.add-user)")
      if (userAvatar && userAvatar.dataset.userId) {
        e.stopPropagation() // Stop propagation to prevent card click
        const userId = userAvatar.dataset.userId
        const user = this.getUserById(userId)
        if (user && confirm(`Remove ${user.name} from this card?`)) {
          this.emit("user:unassign", cardId, userId)
        }
      }
    }
    cardElement.addEventListener("click", removeUserHandler)
    cardElement._removeUserHandler = removeUserHandler
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

      filterGroups.appendChild(group)
    })

    // Setup filter event listeners
    const checkboxes = filterGroups.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const filterType = e.target.dataset.filterType
        const filterValue = e.target.dataset.filterValue
        const isActive = e.target.checked

        this.emit("filter:change", filterType, filterValue, isActive)
      })
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

  switchWorkspace(workspaceId) {
    const oldWorkspace = this.data.currentWorkspace
    this.data.currentWorkspace = workspaceId

    this.showLoading()
    this.loadData()

    this.emit("workspace:switch", oldWorkspace, workspaceId)
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

  toggleTheme() {
    const themes = ["light", "dark", "auto"]
    const currentTheme = this.ui.theme
    const currentIndex = themes.indexOf(currentTheme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]

    this.setTheme(nextTheme)
  }

  setTheme(theme) {
    const oldTheme = this.ui.theme
    this.ui.theme = theme

    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("workspace-theme", theme)

    // Update theme icon
    const themeIcon = document.querySelector(".theme-icon")
    if (themeIcon) {
      const icons = {
        light: "fas fa-sun",
        dark: "fas fa-moon",
        auto: "fas fa-adjust",
      }
      themeIcon.className = `theme-icon ${icons[theme]}`
    }

    this.emit("theme:change", oldTheme, theme)
  }

  handleCardDragStart(card, element) {
    document.body.classList.add("dragging")
  }

  handleCardDragEnd(card, element) {
    document.body.classList.remove("dragging")
  }

  handleCardDrop(card, targetStage, sourceStage) {
    this.showToast(`Moved "${card.title}" from ${sourceStage.label} to ${targetStage.label}`, "success")
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

  handleWorkspaceSwitch(oldWorkspace, newWorkspace) {
    this.showToast(`Switched to ${newWorkspace} workspace`, "info")
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
    this.renderBoard()
  }

  handleFilterClear() {
    this.data.activeFilters = {}

    const checkboxes = document.querySelectorAll('#filterGroups input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false
    })

    this.updateActiveFiltersCount()
    this.renderBoard()
  }

  handleSearchChange(query) {
    // Additional search handling if needed
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

  handleUserAssignment(cardId, userId, stageId) {
    const card = this.getCardById(cardId)
    const user = this.getUserById(userId)

    if (card && user) {
      if (!card.assignedUsers) {
        card.assignedUsers = []
      }

      if (!card.assignedUsers.includes(userId)) {
        card.assignedUsers.push(userId)
        this.renderBoard()
        this.showToast(`${user.name} assigned to "${card.title}"`, "success")

        this.saveUserAssignment(cardId, userId, "assign")
      }
    }
  }

  handleUserUnassignment(cardId, userId) {
    const card = this.getCardById(cardId)
    const user = this.getUserById(userId)

    if (card && user && card.assignedUsers) {
      card.assignedUsers = card.assignedUsers.filter((id) => id !== userId)
      this.renderBoard()
      this.showToast(`${user.name} unassigned from "${card.title}"`, "info")

      this.saveUserAssignment(cardId, userId, "unassign")
    }
  }

  // Modal methods
  openPreviewModal(card) {
    const modal = document.getElementById("previewModal")
    const title = document.getElementById("modalTitle")
    const meta = document.getElementById("modalMeta")

    if (!modal || !title || !meta) return

    title.textContent = card.title
    meta.innerHTML = `
       <span>UID: ${card.uid}</span>
       <span>Page: ${this.escapeHtml(card.pageName)}</span>
       <span>Editor: ${this.escapeHtml(card.editor)}</span>
       <span class="card-badge">${card.stage}</span>
     `

    const commentsCount = document.getElementById("commentsCount")
    if (commentsCount) {
      commentsCount.textContent = card.comments || 0
    }

    this.loadModalContent(card)

    modal.style.display = "flex"
    document.body.style.overflow = "hidden"

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

  closeAllModals() {
    const previewModal = document.getElementById("previewModal")
    if (previewModal) {
      previewModal.style.display = "none"
    }

    const workspaceModal = document.getElementById("workspaceModal")
    if (workspaceModal) {
      workspaceModal.style.display = "none"
    }

    const stageSettingsModal = document.getElementById("stageSettingsModal")
    if (stageSettingsModal) {
      stageSettingsModal.style.display = "none"
    }

    document.body.style.overflow = ""
  }

  switchModalTab(tabName) {
    document
      .querySelectorAll(".modal-container:not(#stageSettingsModal) .tab-btn")
      .forEach((btn) => btn.classList.remove("active"))
    document
      .querySelectorAll(".modal-container:not(#stageSettingsModal) .tab-content")
      .forEach((content) => content.classList.remove("active"))

    const selectedTab = document.querySelector(`.modal-container:not(#stageSettingsModal) [data-tab="${tabName}"]`)
    const selectedContent = document.getElementById(`${tabName}Tab`)

    if (selectedTab) selectedTab.classList.add("active")
    if (selectedContent) selectedContent.classList.add("active")
  }

  loadModalContent(card) {
    const livePreview = document.getElementById("livePreview")
    const workspacePreview = document.getElementById("workspacePreview")

    if (livePreview) {
      livePreview.innerHTML = this.generateMockPreview("live")
    }

    if (workspacePreview) {
      workspacePreview.innerHTML = this.generateMockPreview("workspace")
    }

    this.loadComments(card.id)
    this.loadHistory(card.id)
  }

  loadComments(cardId) {
    const commentsContainer = document.getElementById("commentsContainer")
    if (!commentsContainer) return

    const comments = this.getCardComments(cardId)

    if (comments.length === 0) {
      commentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>'
      return
    }

    commentsContainer.innerHTML = comments
      .map(
        (comment) => `
         <div class="comment">
           <div class="comment-avatar">${this.getInitials(comment.author)}</div>
           <div class="comment-content">
             <div class="comment-header">
               <span class="comment-author">${this.escapeHtml(comment.author)}</span>
               <span class="comment-time">${this.formatDate(comment.timestamp)}</span>
             </div>
             <div class="comment-text">${this.escapeHtml(comment.content)}</div>
           </div>
         </div>
         ${
           comment.replies
             ? comment.replies
                 .map(
                   (reply) => `
           <div class="comment reply">
             <div class="comment-avatar">${this.getInitials(reply.author)}</div>
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

  loadHistory(cardId) {
    const historyContainer = document.getElementById("historyContainer")
    if (!historyContainer) return

    const history = this.getCardHistory(cardId)

    if (history.length === 0) {
      historyContainer.innerHTML = '<div class="no-history">No history available</div>'
      return
    }

    historyContainer.innerHTML = history
      .map(
        (item) => `
         <div class="history-item">
           <div class="history-indicator"></div>
           <div class="history-content">
             <div class="history-action">${this.escapeHtml(item.action)}</div>
             <div class="history-meta">by ${this.escapeHtml(item.author)} • ${this.formatDate(item.timestamp)}</div>
           </div>
         </div>
       `,
      )
      .join("")
  }

  // Card operations
  moveCard(cardId, targetStageId, addToHistory = true) {
    const card = this.getCardById(cardId)
    if (!card) return

    const oldStage = card.stage
    card.stage = targetStageId

    this.renderBoard()

    if (this.options.autoSave) {
      this.saveCardMove(cardId, targetStageId, oldStage)
    }
    if (addToHistory) {
      this.addToHistory({
        type: "move",
        cardId: cardId,
        from: oldStage,
        to: targetStageId,
        timestamp: Date.now(),
      })
    }
  }

  saveCardMove(cardId, targetStageId, sourceStageId) {
    const url = `${this.options.apiUrl}/move`
    const data = {
      cardId: cardId,
      targetStage: targetStageId,
      sourceStage: sourceStageId,
      workspace: this.data.currentWorkspace,
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((result) => {
        if (result.success) {
          this.emit("card:moved", cardId, targetStageId, sourceStageId)
        } else {
          throw new Error(result.message || "Failed to move card")
        }
      })
      .catch((error) => {
        console.error("Failed to save card move:", error)
        this.showToast("Failed to save changes", "error")

        const card = this.getCardById(cardId)
        if (card) {
          card.stage = sourceStageId
          this.renderBoard()
        }
      })
  }

  saveUserAssignment(cardId, userId, action) {
    const url = `${this.options.apiUrl}/assign-user`
    const data = {
      cardId: cardId,
      userId: userId,
      action: action,
      workspace: this.data.currentWorkspace,
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((result) => {
        if (result.success) {
          this.emit("user:assignment-saved", cardId, userId, action)
        } else {
          throw new Error(result.message || "Failed to save user assignment")
        }
      })
      .catch((error) => {
        console.error("Failed to save user assignment:", error)
        this.showToast("Failed to save user assignment", "error")
      })
  }

  // User assignment methods
  showCardUserAssignment(cardId, triggerElement) {
    const card = this.getCardById(cardId)
    if (!card) return

    const existingDropdown = document.querySelector(".user-assignment-dropdown")
    if (existingDropdown) {
      existingDropdown.remove()
    }

    const dropdown = this.createUserAssignmentDropdown(cardId, card.assignedUsers || [])

    const rect = triggerElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    dropdown.style.position = "fixed"
    dropdown.style.zIndex = "9999"

    if (rect.bottom + dropdown.offsetHeight + 10 > viewportHeight) {
      dropdown.style.bottom = viewportHeight - rect.top + 5 + "px"
    } else {
      dropdown.style.top = rect.bottom + 5 + "px"
    }

    if (rect.left + dropdown.offsetWidth > viewportWidth) {
      dropdown.style.right = viewportWidth - rect.right + "px"
    } else {
      dropdown.style.left = rect.left + "px"
    }

    document.body.appendChild(dropdown)

    const closeHandler = (e) => {
      if (!dropdown.contains(e.target) && !triggerElement.contains(e.target)) {
        dropdown.remove()
        document.removeEventListener("click", closeHandler)
        document.removeEventListener("touchstart", closeHandler)
      }
    }

    setTimeout(() => {
      document.addEventListener("click", closeHandler)
      document.addEventListener("touchstart", closeHandler)
    }, 100)
  }

  createUserAssignmentDropdown(cardId, assignedUserIds) {
    const dropdown = document.createElement("div")
    dropdown.className = "user-assignment-dropdown"

    const users = window.WorkspaceConfig?.users || []

    dropdown.innerHTML = users
      .map(
        (user) => `
       <div class="user-option ${assignedUserIds.includes(user.id) ? "assigned" : ""}" 
            data-user-id="${user.id}" 
            data-card-id="${cardId}">
         <div class="user-avatar">
           ${user.avatar ? `<img src="${user.avatar}" alt="${user.name}">` : this.getInitials(user.name)}
         </div>
         <div class="user-info">
           <div class="user-name">${this.escapeHtml(user.name)}</div>
           <div class="user-role">${this.escapeHtml(user.role)}</div>
         </div>
         <div class="assignment-status">
           ${assignedUserIds.includes(user.id) ? '<i class="fas fa-check"></i>' : ""}
         </div>
       </div>
     `,
      )
      .join("")

    dropdown.addEventListener("click", (e) => {
      e.stopPropagation()
      const userOption = e.target.closest(".user-option")
      if (userOption) {
        const userId = userOption.dataset.userId
        const cardId = userOption.dataset.cardId
        const isAssigned = userOption.classList.contains("assigned")

        if (isAssigned) {
          this.emit("user:unassign", cardId, userId)
        } else {
          this.emit("user:assign", cardId, userId)
        }

        dropdown.remove()
      }
    })

    return dropdown
  }

  setupColumnUserAssignment(column, stage) {
    // Event listeners for column actions buttons are handled in setupColumnActions
    // User avatars in column header are handled in setupColumnActions directly (newly added)

    const addUserButtons = column.querySelectorAll(".card-assignees .add-user")
    addUserButtons.forEach((button) => {
      // Remove existing listener to prevent duplicates
      if (button._clickListener) {
        button.removeEventListener("click", button._clickListener)
      }

      const handler = (e) => {
        e.stopPropagation()
        const cardId = button.dataset.cardId
        this.showCardUserAssignment(cardId, button)
      }
      button.addEventListener("click", handler)
      button._clickListener = handler
    })

    const userAvatars = column.querySelectorAll(".card-assignees .user-avatar:not(.add-user)")
    userAvatars.forEach((avatar) => {
      if (avatar.dataset.userId) {
        // Remove existing listener to prevent duplicates
        if (avatar._clickListener) {
          avatar.removeEventListener("click", avatar._clickListener)
        }
        const handler = (e) => {
          e.stopPropagation()
          const cardId = avatar.dataset.cardId
          const userId = avatar.dataset.userId

          if (confirm("Remove user assignment?")) {
            this.emit("user:unassign", cardId, userId)
          }
        }
        avatar.addEventListener("click", handler)
        avatar._clickListener = handler
      }
    })
  }

  setupAllUserAssignments() {
    const columns = document.querySelectorAll(".kanban-column")
    columns.forEach((column) => {
      const stageId = column.dataset.stageId
      const stage = this.getStageById(stageId)
      if (stage) {
        this.setupColumnUserAssignment(column, stage)
      }
    })

    const cards = document.querySelectorAll(".kanban-card")
    cards.forEach((cardEl) => {
      this.setupCardUserAssignment(cardEl)
    })
  }

  // Utility methods
  getCardById(cardId) {
    return this.data.cards.find((card) => card.id === cardId)
  }

  getStageById(stageId) {
    return this.data.stages.find((stage) => stage.id === stageId)
  }

  getUserById(userId) {
    if (window.WorkspaceConfig && window.WorkspaceConfig.users) {
      return window.WorkspaceConfig.users.find((user) => user.id === userId)
    }
    return null
  }

  getStageAssignedUsers(stageId) {
    if (window.WorkspaceConfig && window.WorkspaceConfig.stageAssignments) {
      return window.WorkspaceConfig.stageAssignments[stageId] || []
    }
    return []
  }

  getCardComments(cardId) {
    if (window.WorkspaceConfig && window.WorkspaceConfig.mockData && window.WorkspaceConfig.mockData.comments) {
      return window.WorkspaceConfig.mockData.comments[cardId] || []
    }
    return []
  }

  getCardHistory(cardId) {
    if (window.WorkspaceConfig && window.WorkspaceConfig.mockData && window.WorkspaceConfig.mockData.history) {
      return window.WorkspaceConfig.mockData.history[cardId] || []
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

  getLanguageFlag(language) {
    const flags = {
      en: "🇺🇸",
      de: "🇩🇪",
      fr: "🇫🇷",
      es: "🇪🇸",
    }
    return flags[language] || "🌐"
  }

  formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return "Today"
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
      })
    }
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

  generateMockPreview(type) {
    const isWorkspace = type === "workspace"
    // Use direct colors for mock preview consistent with styles.css vars
    const bgColor = isWorkspace ? "rgba(0, 123, 255, 0.05)" : "var(--bg-secondary)" // Using existing CSS var for secondary background
    const borderColor = isWorkspace ? "rgba(0, 123, 255, 0.2)" : "var(--border-light)"

    return `
       <div class="preview-content">
           <div class="preview-block" style="height: 20px; margin-bottom: 10px; width: 75%; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: var(--border-radius-sm);"></div>
           <div class="preview-block" style="height: 20px; margin-bottom: 10px; width: 50%; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: var(--border-radius-sm);"></div>
           <div class="preview-block" style="height: 120px; margin-bottom: 10px; width: 100%; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: var(--border-radius-sm);"></div>
           <div class="preview-block" style="height: 20px; margin-bottom: 10px; width: 65%; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: var(--border-radius-sm);"></div>
           ${isWorkspace ? '<div class="preview-highlight">Modified content</div>' : ""}
       </div>
     `
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
    const container = document.getElementById("toastContainer")
    if (!container) return

    const toast = document.createElement("div")
    toast.className = `toast ${type}`

    const icon = this.getToastIcon(type)

    toast.innerHTML = `
       <i class="${icon}"></i>
       <div class="toast-content">
           <div class="toast-message">${this.escapeHtml(message)}</div>
       </div>
       <button class="toast-close">
           <i class="fas fa-times"></i>
       </button>
     `

    const closeBtn = toast.querySelector(".toast-close")
    closeBtn.addEventListener("click", () => {
      this.removeToast(toast)
    })

    container.appendChild(toast)

    setTimeout(() => {
      this.removeToast(toast)
    }, duration)
  }

  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.style.animation = "slideOut 0.3s ease forwards"
      setTimeout(() => {
        toast.remove()
      }, 300)
    }
  }

  getToastIcon(type) {
    const icons = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    }
    return icons[type] || icons.info
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
        console.error("Event callback error:", error)
      }
    })
    return this
  }
}
