// Import the WorkspaceBoard class
import { WorkspaceBoard } from "./Workspace.js" // Corrected import path

// Initialize the TYPO3 Workspace Board Application
function initWorkspaceApp() {
  // Initialize the workspace board
  const workspaceBoard = new WorkspaceBoard("#kanbanBoard", {
    apiUrl: "/typo3/ajax/workspace",
    getDataApiUrl: (typeof TYPO3 !== 'undefined' && TYPO3.settings && TYPO3.settings.ajaxUrls && TYPO3.settings.ajaxUrls.workspace_dispatch) || "/typo3/ajax/workspace",
    enableDragDrop: true,
    enableFilters: true,
    enableSearch: true,
    enableComments: true,
    autoSave: true,
    autoSaveDelay: 2000,
    theme: "auto",
    animations: true,
    mockData: false, // Set to false in production
  })

  // Global event listeners for the application
  workspaceBoard.on("board:initialized", (board) => {
    console.log("Workspace board initialized successfully")
    board.showToast("Workspace board loaded successfully", "success")
  })

  workspaceBoard.on("card:moved", (cards, targetStage, sourceStage) => {
    console.log(`Card moved event: ${cards.length} card(s) moved to stage ${targetStage}`)    
    // Handle saving card move to server
    const url = workspaceBoard.options.getDataApiUrl || workspaceBoard.options.apiUrl
    
    if (!url) {
      console.error('No API URL configured for card move');
      workspaceBoard.showToast("API URL not configured", "error");
      return;
    }

    // Create payload data with an entry for each card
    const payloadData = cards.map(card => ({
      "table": card.table,
      "uid": card.uid,
      "t3ver_oid": card.t3ver_oid
    }));
    
    const payload = {
      action: "Actions",
      method: "sendToSpecificStageExecute",
      data: [{
        "affects": {
          "elements": payloadData,
          "nextStage": targetStage
        }
      }]
    }

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
          workspaceBoard.refresh();
          workspaceBoard.clearSelection();
          workspaceBoard.showToast("Changes saved", "success", 2000)
        } else {
          throw new Error((result && result.message) || "Failed to move card")
        }
      })
      .catch((error) => {
        console.error("Failed to save card move:", error)
        workspaceBoard.showToast("Failed to save changes to server (moved locally only)", "warning")
        // Optionally revert the move
        // workspaceBoard.revertCardMove(cardId, sourceStage)
      })
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

  workspaceBoard.on("card:dragstart", (cardData, element) => {
    console.log("🎯 card:dragstart event fired!", { cardData, element })
    performanceMetrics.dragOperations++
  })

  // Expose workspace board to global scope for debugging
  window.workspaceBoard = workspaceBoard
  window.performanceMetrics = performanceMetrics


  // Handle user assignment with server save
  workspaceBoard.on("user:assign", (cardId, userId) => {
    console.log(`🔄 User assignment event: Card ${cardId} -> User ${userId}`)
    const card = workspaceBoard.getCardById(cardId)
    const user = workspaceBoard.getUserById(userId)
    console.log("Card data:", card)
    console.log("User data:", user)
    
    // Save user assignment to server
    const baseUrl = workspaceBoard.options.apiUrl;
    if (!baseUrl) {
      console.error('No API URL configured for user assignment');
      return;
    }
    
    const url = `${baseUrl}/assign-user`
    const data = {
      cardId: cardId,
      userId: userId,
      action: "assign",
      workspace: workspaceBoard.data.currentWorkspace,
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(result => {
        if (result && result.success !== false) {
          console.log("User assignment saved successfully")
        } else {
          throw new Error((result && result.message) || "Failed to save user assignment")
        }
      })
      .catch((error) => {
        console.error("Failed to save user assignment:", error)
        workspaceBoard.showToast("Failed to save user assignment to server (changed locally only)", "warning")
      })
  })

  workspaceBoard.on("user:unassign", (cardId, userId) => {
    console.log(`❌ User unassignment event: Card ${cardId} -> User ${userId}`)
    
    // Save user unassignment to server
    const baseUrl = workspaceBoard.options.apiUrl;
    if (!baseUrl) {
      console.error('No API URL configured for user unassignment');
      return;
    }
    
    const url = `${baseUrl}/assign-user`
    const data = {
      cardId: cardId,
      userId: userId,
      action: "unassign",
      workspace: workspaceBoard.data.currentWorkspace,
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(result => {
        if (result && result.success !== false) {
          console.log("User unassignment saved successfully")
        } else {
          throw new Error((result && result.message) || "Failed to save user unassignment")
        }
      })
      .catch((error) => {
        console.error("Failed to save user unassignment:", error)
        workspaceBoard.showToast("Failed to save user unassignment to server (changed locally only)", "warning")
      })
  })

  workspaceBoard.on("stage:user:assign", (stageId, userId) => {
    console.log(`🔄 Stage user assignment event: Stage ${stageId} -> User ${userId}`)
    console.log("Current stage assignments:", window.WorkspaceConfig.stageAssignments[stageId])
    
    // Save stage user assignment to server
    const baseUrl = workspaceBoard.options.apiUrl;
    if (!baseUrl) {
      console.error('No API URL configured for stage user assignment');
      return;
    }
    
    const url = `${baseUrl}/stages/${stageId}/assign`
    const data = {
      userId: userId,
      action: "assign"
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(result => {
        console.log("Stage user assignment saved:", result)
      })
      .catch(error => {
        console.error("Failed to save stage user assignment:", error)
      })
  })

  workspaceBoard.on("stage:user:unassign", (stageId, userId) => {
    console.log(`❌ Stage user unassignment event: Stage ${stageId} -> User ${userId}`)
    console.log("Current stage assignments:", window.WorkspaceConfig.stageAssignments[stageId])
    
    // Save stage user unassignment to server
    const baseUrl = workspaceBoard.options.apiUrl;
    if (!baseUrl) {
      console.error('No API URL configured for stage user unassignment');
      return;
    }
    
    const url = `${baseUrl}/stages/${stageId}/assign`
    const data = {
      userId: userId,
      action: "unassign"
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(result => {
        console.log("Stage user unassignment saved:", result)
      })
      .catch(error => {
        console.error("Failed to save stage user unassignment:", error)
      })
  })
  
  // Handle bulk operations
  workspaceBoard.on("bulk:assign", (cardIds, userIds) => {
    console.log(`Bulk assign: ${userIds.length} users to ${cardIds.length} cards`)
    
    // Save bulk assignment to server
    const baseUrl = workspaceBoard.options.apiUrl;
    if (!baseUrl) {
      console.error('No API URL configured for bulk assignment');
      return;
    }
    
    const url = `${baseUrl}/bulk-assign`
    const data = {
      cardIds: cardIds,
      userIds: userIds,
      workspace: workspaceBoard.data.currentWorkspace,
    }

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(result => {
        console.log("Bulk assignment saved:", result)
      })
      .catch(error => {
        console.error("Failed to save bulk assignment:", error)
        workspaceBoard.showToast("Failed to save bulk assignment to server", "warning")
      })
  })
}

initWorkspaceApp();