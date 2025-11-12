// Import the WorkspaceBoard class
import { WorkspaceBoard } from "./Workspace.js" // Corrected import path

// Initialize the TYPO3 Workspace Board Application
function initWorkspaceApp() {
  // Initialize the workspace board
  const workspaceBoard = new WorkspaceBoard("#kanbanBoard", {
    apiUrl: "/typo3/ajax/workspace",
    getDataApiUrl: TYPO3.settings.ajaxUrls.workspace_dispatch,
    enableDragDrop: true,
    enableFilters: true,
    enableSearch: true,
    enableComments: true,
    autoSave: true,
    autoSaveDelay: 2000,
    theme: "auto",
    animations: true,
    mockData: true, // Set to false in production
  })

  // Global event listeners for the application
  workspaceBoard.on("board:initialized", (board) => {
    console.log("Workspace board initialized successfully")
    board.showToast("Workspace board loaded successfully", "success")
  })

  workspaceBoard.on("card:moved", (cardId, targetStage, sourceStage) => {
    console.log(`Card ${cardId} moved from ${sourceStage} to ${targetStage}`)
  })

  workspaceBoard.on("workspace:switch", (oldWorkspace, newWorkspace) => {
    console.log(`Switched workspace from ${oldWorkspace} to ${newWorkspace}`)
  })

  workspaceBoard.on("filter:change", (filterType, filterValue, isActive) => {
    console.log(`Filter ${filterType}:${filterValue} ${isActive ? "activated" : "deactivated"}`)
  })

  workspaceBoard.on("search:change", (query) => {
    console.log(`Search query changed: ${query}`)
  })

  workspaceBoard.on("theme:change", (oldTheme, newTheme) => {
    console.log(`Theme changed from ${oldTheme} to ${newTheme}`)
  })

  // Error handling
  workspaceBoard.on("error", (error) => {
    console.error("Workspace board error:", error)
    workspaceBoard.showToast("An error occurred. Please try again.", "error")
  })

  // Performance monitoring
  const performanceMetrics = {
    renderTime: 0,
    dragOperations: 0,
    apiCalls: 0,
  }

  workspaceBoard.on("board:rendered", () => {
    const renderEnd = performance.now()
    performanceMetrics.renderTime = renderEnd
  })

  workspaceBoard.on("card:dragstart", () => {
    performanceMetrics.dragOperations++
  })

  // Expose workspace board to global scope for debugging
  window.workspaceBoard = workspaceBoard
  window.performanceMetrics = performanceMetrics

  // Debug functions for testing
  window.testFilters = () => {
    console.log("=== GLOBAL FILTER DEBUG ===")
    console.log("Current active global filters:", workspaceBoard.data.activeFilters)
    console.log("All cards:", workspaceBoard.data.cards.length)
    console.log("Globally filtered cards:", workspaceBoard.getFilteredCards().length)

    Object.keys(workspaceBoard.data.filters).forEach((filterType) => {
      console.log(`${filterType} options:`, workspaceBoard.data.filters[filterType].options)
    })
  }

  window.testUserAssignment = (cardId, userId) => {
    console.log("=== CARD USER ASSIGNMENT DEBUG ===")
    cardId = cardId || "1"
    userId = userId || "john"

    const card = workspaceBoard.getCardById(cardId)
    const user = workspaceBoard.getUserById(userId)

    console.log("Card:", card)
    console.log("User:", user)
    console.log("Current card assignments:", card?.assignedUsers)

    console.log("Testing assignment...")
    // Simulate clicking the add user button on a card
    const cardElement = document.querySelector(`.kanban-card[data-card-id="${cardId}"]`)
    const addUserBtn = cardElement?.querySelector(".add-user")
    if (addUserBtn) {
      addUserBtn.click()
      setTimeout(() => {
        const userItem = document.querySelector(
          `.user-assignment-dropdown .user-option[data-user-id="${userId}"]`, // Corrected selector
        )
        if (userItem) {
          userItem.click()
        } else {
          console.log("User item not found in dropdown.")
        }
      }, 100)
    } else {
      console.log("Add user button not found on card.")
    }
  }

  window.debugUserAssignment = () => {
    console.log("=== USER ASSIGNMENT SYSTEM DEBUG ===")

    console.log("WorkspaceConfig loaded:", !!window.WorkspaceConfig)
    console.log("Users available:", window.WorkspaceConfig?.users?.length || 0)

    const cardsWithUsers = workspaceBoard.data.cards.filter(
      (card) => card.assignedUsers && card.assignedUsers.length > 0,
    )
    console.log("Cards with assignments:", cardsWithUsers.length)

    const testCard = document.querySelector(".kanban-card")
    if (testCard) {
      console.log("Test card found:", testCard.dataset.cardId)
      const addUserBtn = testCard.querySelector(".add-user")
      console.log("Add user button found:", !!addUserBtn)
    }
  }

  // Enhanced user assignment debugging
  workspaceBoard.on("user:assign", (cardId, userId) => {
    console.log(`🔄 User assignment event: Card ${cardId} -> User ${userId}`)
    const card = workspaceBoard.getCardById(cardId)
    const user = workspaceBoard.getUserById(userId)
    console.log("Card data:", card)
    console.log("User data:", user)
  })

  workspaceBoard.on("user:unassign", (cardId, userId) => {
    console.log(`❌ User unassignment event: Card ${cardId} -> User ${userId}`)
  })

  workspaceBoard.on("stage:user-assign", (stageId, userId) => {
    console.log(`🔄 Stage user assignment event: Stage ${stageId} -> User ${userId}`)
    console.log("Current stage assignments:", window.WorkspaceConfig.stageAssignments[stageId])
  })

  workspaceBoard.on("stage:user-unassign", (stageId, userId) => {
    console.log(`❌ Stage user unassignment event: Stage ${stageId} -> User ${userId}`)
    console.log("Current stage assignments:", window.WorkspaceConfig.stageAssignments[stageId])
  })

  // Bulk operations debugging
  window.testBulkOperations = () => {
    console.log("=== BULK OPERATIONS DEBUG ===")
    console.log("Selected cards:", workspaceBoard.ui.selectedCards)
    console.log("Multi-select mode:", document.body.classList.contains("multi-select-mode"))
    console.log("Body classes:", document.body.className)
  }

  // Keyboard shortcuts debugging
  window.testKeyboardShortcuts = () => {
    console.log("=== KEYBOARD SHORTCUTS DEBUG ===")
    console.log("Testing Ctrl+F...")

    // Simulate Ctrl+F
    const event = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)

    setTimeout(() => {
      const searchInput = document.getElementById("globalSearch")
      console.log("Search input focused:", document.activeElement === searchInput)
    }, 100)
  }

  // Workspace management debugging
  window.testWorkspaceModal = (workspaceId = null) => {
    console.log("=== WORKSPACE MODAL DEBUG ===")
    workspaceBoard.openWorkspaceModal(workspaceId)
  }

  // New debug functions for stage actions
  window.testStageActions = (stageId = "draft") => {
    console.log("=== STAGE ACTIONS DEBUG ===")
    const stage = workspaceBoard.getStageById(stageId)
    if (!stage) {
      console.log(`Stage with ID "${stageId}" not found.`)
      return
    }
    console.log("Selected Stage:", stage)
    console.log("Current column user filter for stage:", workspaceBoard.data.columnUserFilters[stageId])
    console.log("Current column sort for stage:", workspaceBoard.data.columnSorts[stageId])

    console.log("Testing 'Edit Stage' modal...")
    workspaceBoard.openStageSettingsModal(stageId)

    setTimeout(() => {
      console.log("Testing 'Assign Users to Stage' dropdown...")
      const assignUsersBtn = document.querySelector(
        `.column-action[data-action="assign-users"][data-stage-id="${stageId}"]`,
      )
      if (assignUsersBtn) {
        assignUsersBtn.click() // Simulate click
      } else {
        console.log("Assign Users button not found for stage:", stageId)
      }
    }, 1500)

    setTimeout(() => {
      console.log("Testing 'Sort Items' for stage...")
      workspaceBoard.toggleColumnSort(stageId, "modifiedDate") // Toggle sort by modifiedDate
    }, 3000)

    setTimeout(() => {
      console.log("Testing 'More Options' context menu for stage...")
      const moreOptionsBtn = document.querySelector(`.column-action[data-action="more"][data-stage-id="${stageId}"]`)
      if (moreOptionsBtn) {
        moreOptionsBtn.click() // Simulate click
      } else {
        console.log("More Options button not found for stage:", stageId)
      }
    }, 4500)
  }

  window.addTestStage = () => {
    console.log("Adding a new test stage via workspace modal stages tab...")
    workspaceBoard.openWorkspaceModal()
    workspaceBoard.switchModalTab("stages")
    document.getElementById("addStageBtn").click()
    console.log("New stage added to form. Remember to save the workspace to persist.")
  }

  console.log("Debug functions available:")
  console.log("- testFilters()")
  console.log("- testUserAssignment(cardId, userId)")
  console.log("- debugUserAssignment()")
  console.log("- testBulkOperations()")
  console.log("- testKeyboardShortcuts()")
  console.log("- testWorkspaceModal(workspaceId)")
  console.log("- testStageActions(stageId)")
  console.log("- addTestStage()")
}

initWorkspaceApp();