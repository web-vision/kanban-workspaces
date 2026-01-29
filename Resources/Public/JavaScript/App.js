// Import the WorkspaceBoard class
import { WorkspaceBoard } from "./Workspace.js" // Corrected import path
import Notification from '@typo3/backend/notification.js';

// Initialize the TYPO3 Workspace Board Application
function initWorkspaceApp() {
  // Initialize the workspace board
  const workspaceBoard = new WorkspaceBoard("#kanbanBoard", {
    apiUrl: "/typo3/ajax/workspace",
    getDataApiUrl: (typeof TYPO3 !== 'undefined' && TYPO3.settings && TYPO3.settings.ajaxUrls && TYPO3.settings.ajaxUrls.workspace_dispatch) || "/typo3/ajax/workspace",
    getProcessApiUrl: (typeof TYPO3 !== 'undefined' && TYPO3.settings && TYPO3.settings.ajaxUrls && TYPO3.settings.ajaxUrls.usersettings_process) || "/typo3/ajax/process",
    enableDragDrop: true,
    enableFilters: true,
    enableSearch: true,
    enableComments: true,
    autoSave: true,
    autoSaveDelay: 2000,
    animations: true,
    mockData: false, // Set to false in production
  })

  // Global event listeners for the application
  workspaceBoard.on("board:initialized", (board) => {
    document.documentElement.setAttribute("data-color-scheme", "auto")
  })

  workspaceBoard.on("card:moved", (cards, targetStage, sourceStage) => {
    console.log(`Card moved event: ${cards.length} card(s) moved to stage ${targetStage}`)    
    // Handle saving card move to server
    const url = workspaceBoard.options.getDataApiUrl || workspaceBoard.options.apiUrl
    
    if (!url) {
      console.error('No API URL configured for card move');
      Notification.error('', 'API URL not configured', 5);
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
          Notification.success('', 'Changes saved', 2)
        } else {
          throw new Error((result && result.message) || "Failed to move card")
        }
      })
      .catch((error) => {
        console.error("Failed to save card move:", error)
        Notification.warning('', 'Failed to save changes to server (moved locally only)', 5)
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

  // Error handling
  workspaceBoard.on("error", (error) => {
    console.error("Workspace board error:", error)
    Notification.error('', 'An error occurred. Please try again.', 5)
  })

  // Comment added event
  workspaceBoard.on("comment:added", (cardId, commentText) => {
    console.log(`💬 Comment added to card ${cardId}: ${commentText}`)
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

}

initWorkspaceApp();