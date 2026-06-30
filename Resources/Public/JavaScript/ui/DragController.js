import { showToast } from '@web-vision/kanban-workspaces/core/utils.js';

/**
 * Wires up card drag-and-drop and column drop targets, manages drop
 * placeholders, and starts the stage-transition workflow when a card is
 * dropped onto another stage. Also handles the board's drag-related custom
 * events.
 */
export class DragController {
  constructor(board) {
    this.board = board
  }

  // Setup drag and drop functionality
  setupDragAndDrop() {
    const cards = document.querySelectorAll(".kanban-card")
    const columns = document.querySelectorAll(".column-content")

    // Setup card drag events and card menu (context menu) for each card
    cards.forEach((cardEl) => {
      const cardId = cardEl.dataset.cardId
      const cardData = this.board.getCardById(cardId)
      if (cardData) {
        this.setupCardDragAndClick(cardEl, cardData)
        this.board.cardActions.setupCardMenuActions(cardEl)
      } else {
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
        const stage = this.board.getStageById(stageId)

        if (stage) {
          this.board.emit("stage:dragover", stage, column)
        }
      })

      column.addEventListener("dragleave", (e) => {
        if (!column.contains(e.relatedTarget)) {
          column.classList.remove("drag-over")
          this.hidePlaceholderInColumn(column)

          const stageId = column.dataset.stageId
          const stage = this.board.getStageById(stageId)

          if (stage) {
            this.board.emit("stage:dragleave", stage, column)
          }
        }
      })

      column.addEventListener("drop", (e) => {
        e.preventDefault()
        column.classList.remove("drag-over")
        this.hidePlaceholderInColumn(column)

        const cardId = e.dataTransfer.getData("text/plain")
        const stageId = column.dataset.stageId

        if (cardId && stageId && this.board.ui.draggedCard) {
          const targetStage = this.board.getStageById(stageId)
          const sourceStage = this.board.getStageById(this.board.ui.draggedCard.stage)

          if (targetStage && sourceStage && targetStage.id != sourceStage.id) {
            // Determine if moving to next or previous stage
            const sourceStageIndex = this.board.data.stages.findIndex(s => s.id === sourceStage.id)
            const targetStageIndex = this.board.data.stages.findIndex(s => s.id === targetStage.id)

            // Show notification modal before stage transition (reusing existing logic)
            const cardIds = this.board.ui.selectedCards.size > 0 ? Array.from(this.board.ui.selectedCards) : [cardId]

            if (targetStageIndex > sourceStageIndex) {
              // Moving forward - use next stage workflow
              this.handleStageTransitionWithModal(cardIds, 'next', targetStage, sourceStage)
            } else {
              // Moving backward - use prev stage workflow
              this.handleStageTransitionWithModal(cardIds, 'prev', targetStage, sourceStage)
            }

            this.board.emit("card:drop", this.board.ui.draggedCard, targetStage, sourceStage)
          }
        }

        this.board.emit("stage:drop", this.board.getStageById(stageId), column)
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

      this.board.ui.draggedCard = cardData
      this.board.ui.draggedElement = e.target

      e.target.classList.add("dragging")
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", cardData.id)

      this.showDragPlaceholders(cardData)
      this.board.emit("card:dragstart", cardData, e.target)
    }

    cardEl._dragendHandler = (e) => {
      e.target.classList.remove("dragging")
      this.hideDragPlaceholders()

      if (this.board.ui.draggedCard) {
        this.board.emit("card:dragend", this.board.ui.draggedCard, e.target)
      }

      this.board.ui.draggedCard = null
      this.board.ui.draggedElement = null

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

      this.board.emit("card:click", cardData)
    }

    cardEl.addEventListener("dragstart", cardEl._dragstartHandler)
    cardEl.addEventListener("dragend", cardEl._dragendHandler)
    cardEl.addEventListener("click", cardEl._clickHandler)
  }

  // Drag placeholder methods
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
      const card = this.board.getCardById(cardId)
      if (!card) {
        console.error("Card not found:", cardId)
        showToast("Card not found", "error")
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

      if (!data || !data[0] || !data[0].result) {
        throw new Error(`Invalid response from ${method}`)
      }

      const formData = data[0].result

      // Open custom modal instead of TYPO3 Modal
      this.board.modals.openSendToStageModal(formData, {
        url: url,
        executeMethod: executeMethod,
        cardIds: cardIds,
        targetStage: targetStage,
        sourceStage: sourceStage,
        isDragDrop: true
      })

    } catch (error) {
      console.error("Failed to load stage form:", error)
      showToast("Failed to load stage form: " + error.message, "error")
      // Revert the visual state on error
      this.board.renderer.renderBoard()
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
}
