// Import the WorkspaceBoard class
import { WorkspaceBoard } from "@web-vision/kanban-workspaces/WorkspaceBoard.js"
import { initHorizontalScroll } from "@web-vision/kanban-workspaces/core/HorizontalScroll.js"
import Notification from '@typo3/backend/notification.js';

// Initialize the TYPO3 Workspace Board Application
function initWorkspaceApp() {
  // Enable drag-to-scroll on the horizontal board
  initHorizontalScroll()

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

  workspaceBoard.on("card:moved", (cards, targetStage) => {
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
    
    // sendToSpecificStageExecute reads $parameters->comments without a null
    // guard (unlike recipients/additional, which use ??). A bare move carries
    // no stage comment, so send explicit empty values to keep the request
    // well-formed and avoid Core exception #1476107295.
    const payload = {
      action: "Actions",
      method: "sendToSpecificStageExecute",
      data: [{
        "comments": "",
        "recipients": [],
        "additional": "",
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
      })
  })

  workspaceBoard.on("workspace:switch", () => {})

  workspaceBoard.on("filter:change", () => {})

  workspaceBoard.on("search:change", () => {})

  // Error handling
  workspaceBoard.on("error", (error) => {
    console.error("Workspace board error:", error)
    Notification.error('', 'An error occurred. Please try again.', 5)
  })

  workspaceBoard.on("comment:added", () => {})

  workspaceBoard.on("board:rendered", () => {})

  workspaceBoard.on("card:dragstart", () => {})

  window.workspaceBoard = workspaceBoard
}

initWorkspaceApp();