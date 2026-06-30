import Notification from '@typo3/backend/notification.js';
import Modal from '@typo3/backend/modal.js';
import { SeverityEnum } from '@typo3/backend/enum/severity.js';
import DeferredAction from '@typo3/backend/action-button/deferred-action.js';
import Utility from '@typo3/backend/utility.js';
import { escapeHtml, showToast } from '@web-vision/kanban-workspaces/core/utils.js';

/**
 * Per-card actions reachable from the card context menu: preview, edit, open
 * page version, assign a backend user, discard the version, plus the move /
 * revert primitives that mutate a card's stage.
 */
export class CardActions {
  constructor(board) {
    this.board = board
    this._assignModalCard = null
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
    const card = this.board.getCardById(cardId)
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
    const currentStage = this.board.getStageById(card.stage)
    const otherStages = this.board.data.stages.filter(s => s.id !== card.stage)

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
        break
    }
  }

  // Card action methods
  previewElement(card) {
    const url = this.board.options.getDataApiUrl || this.board.options.apiUrl;

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
          return [];
        }

        const result = apiResponse[0];
        if (!result || !result.result) {
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
    showToast(`Edit functionality for card "${card.title}" - would open TYPO3 editor`, "info")
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
      const username = escapeHtml(String(u.username || ''));
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
        this.board.modals.closeAssignModal();
        Notification.success('Assign', 'Assignment saved', 2);
        this.board.loadData();
      } else {
        throw new Error(result?.error || 'Assign failed');
      }
    } catch (err) {
      console.error('Assign failed:', err);
      Notification.error('Assign', err.message || 'Failed to save assignment', 5);
      this.board.modals.closeAssignModal();
    }
  }

  deleteCard(card) {
    const url = this.board.options.getDataApiUrl || this.board.options.apiUrl;

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
            throw new Error('Invalid API response format');
          }

          const result = apiResponse[0];
          if (!result) {
            throw new Error('No data found in API response');
          }

          // Reload data and show success message
          this.board.loadData();
          showToast(`Card "${card.title}" deleted successfully`, "success");

          return result;
        })
        .catch((error) => {
          console.error('Failed to delete card:', error);
          showToast(`Failed to delete card: ${error.message}`, "error");
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

  // Card operations
  moveCard(cardId, targetStageId, addToHistory = true, persist = true) {
    // Handle both single cardId (string) and array of cardIds
    const cardIds = Array.isArray(cardId) ? cardId : [cardId];

    const cards = [];
    const oldStages = {};


    // Process each card
    cardIds.forEach(id => {
      const card = this.board.getCardById(id);
      if (!card) return;

      oldStages[id] = card.stage;
      card.stage = targetStageId;
      cards.push(card);
    });

    if (cards.length === 0) return;

    this.board.renderer.renderBoard();

    // "card:moved" is the signal to persist the move to the server. Callers that
    // already persisted the transition themselves (e.g. the Send to Stage modal,
    // which posts sendToNextStageExecute/sendToPrevStageExecute with the comment
    // and recipient data) pass persist=false so the move is only reconciled
    // locally. Emitting here would otherwise trigger a second, redundant
    // sendToSpecificStageExecute request that lacks the comment payload.
    if (persist) {
      this.board.emit("card:moved", cards, targetStageId, oldStages);
    }
  }

  // Revert card move - called by App.js if save fails
  revertCardMove(cardId, sourceStageId) {
    const card = this.board.getCardById(cardId)
    if (card) {
      card.stage = sourceStageId
      this.board.renderer.renderBoard()
    }
  }
}
