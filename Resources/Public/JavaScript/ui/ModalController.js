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
import Notification from '@typo3/backend/notification.js';
import Icons from '@typo3/backend/icons.js';
import { escapeHtml, getInitials, formatDate, showToast, showLoading, hideLoading } from '@web-vision/kanban-workspaces/core/utils.js';
/**
 * Owns every modal on the board: the card preview modal (summary / comments /
 * history tabs), the custom "send to stage" modal and the stage transition
 * workflow (revert / approve). Holds the transient send-to-stage form state.
 */
export class ModalController {
    board;
    currentStageFormContext = null;
    currentStageFormData = null;
    constructor(board) {
        this.board = board;
        this.currentStageFormContext = null;
        this.currentStageFormData = null;
    }
    // Setup modal event listeners
    setupModalEvents() {
        // Preview modal
        const previewModal = document.getElementById("previewModal");
        const closeModal = document.getElementById("closeModal");
        const closeModalBtn = document.getElementById("closeModalBtn");
        if (closeModal) {
            closeModal.addEventListener("click", () => this.closePreviewModal());
        }
        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", () => this.closePreviewModal());
        }
        // Modal tabs
        const tabBtns = document.querySelectorAll("#previewModal .nav-link");
        tabBtns.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                this.switchModalTab(e.target.dataset.tab);
            });
        });
        // Close modals on overlay click
        if (previewModal) {
            previewModal.addEventListener("click", (e) => {
                if (e.target === previewModal) {
                    this.closePreviewModal();
                }
            });
        }
        // Assign modal
        const assignModal = document.getElementById("assignModal");
        const closeAssignModalBtn = document.getElementById("closeAssignModal");
        const assignModalCancelBtn = document.getElementById("assignModalCancel");
        const assignModalOkBtn = document.getElementById("assignModalOk");
        if (closeAssignModalBtn) {
            closeAssignModalBtn.addEventListener("click", () => this.closeAssignModal());
        }
        if (assignModalCancelBtn) {
            assignModalCancelBtn.addEventListener("click", () => this.closeAssignModal());
        }
        if (assignModal) {
            assignModal.addEventListener("click", (e) => {
                if (e.target === assignModal) {
                    this.closeAssignModal();
                }
            });
        }
        if (assignModalOkBtn) {
            assignModalOkBtn.addEventListener("click", () => this.board.cardActions.handleAssignModalOk());
        }
        // Add comment button
        const addCommentBtn = document.getElementById("addComment");
        if (addCommentBtn) {
            addCommentBtn.addEventListener("click", () => this.handleAddComment());
        }
        // Revert stage button
        const revertStageBtn = document.getElementById("revertBtn");
        if (revertStageBtn) {
            revertStageBtn.addEventListener("click", () => this.handleRevertStage());
        }
        // Next stage button
        const nextStageBtn = document.getElementById("approveBtn");
        if (nextStageBtn) {
            nextStageBtn.addEventListener("click", () => this.handleNextStage());
        }
        // Send to Stage modal
        const sendToStageModal = document.getElementById("sendToStageModal");
        const closeSendToStageModalBtn = document.getElementById("closeSendToStageModal");
        const cancelSendToStageBtn = document.getElementById("cancelSendToStageBtn");
        const submitSendToStageBtn = document.getElementById("submitSendToStageBtn");
        if (closeSendToStageModalBtn) {
            closeSendToStageModalBtn.addEventListener("click", () => this.closeSendToStageModal());
        }
        if (cancelSendToStageBtn) {
            cancelSendToStageBtn.addEventListener("click", () => this.closeSendToStageModal());
        }
        if (submitSendToStageBtn) {
            submitSendToStageBtn.addEventListener("click", () => this.handleSendToStageSubmit());
        }
        if (sendToStageModal) {
            sendToStageModal.addEventListener("click", (e) => {
                if (e.target === sendToStageModal) {
                    this.closeSendToStageModal();
                }
            });
        }
    }
    // Modal methods
    openPreviewModal(card) {
        const modal = document.getElementById("previewModal");
        const title = document.getElementById("modalTitle");
        const meta = document.getElementById("modalMeta");
        if (!modal || !title || !meta)
            return;
        title.textContent = card.title;
        const stage = this.board.getStageById(card.stage);
        const stageLabel = stage ? stage.label : card.stage;
        meta.setAttribute("data-id", card.id);
        meta.innerHTML = `
       <span>UID: ${card.uid}</span>
       <span>Page: ${escapeHtml(card.pageName)}</span>
       ${card.editor ? `<span>Editor: ${escapeHtml(card.editor)}</span>` : ''}
       <span class="card-badge">${escapeHtml(stageLabel)}</span>
     `;
        // Reset to first tab (Summary of changes)
        this.switchModalTab('changes');
        // Initialize comment count (will be updated after data loads)
        const commentsCount = document.getElementById("commentsCount");
        if (commentsCount) {
            commentsCount.textContent = '0';
        }
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        // Fetch card details and then load modal content
        showLoading();
        this.board.api.fetchCardDetails(card)
            .then(() => {
            this.loadModalContent(card);
        })
            .catch((error) => {
            console.error('Failed to load card details:', error);
            this.loadModalContent(card); // Load anyway with whatever data we have
        })
            .finally(() => {
            hideLoading();
        });
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }
    closePreviewModal() {
        const modal = document.getElementById("previewModal");
        if (modal) {
            modal.style.display = "none";
            document.body.style.overflow = "";
        }
    }
    closeAssignModal() {
        const assignModal = document.getElementById("assignModal");
        if (assignModal) {
            assignModal.style.display = "none";
        }
        document.body.style.overflow = "";
    }
    closeAllModals() {
        const previewModal = document.getElementById("previewModal");
        if (previewModal) {
            previewModal.style.display = "none";
        }
        const assignModal = document.getElementById("assignModal");
        if (assignModal) {
            assignModal.style.display = "none";
        }
        document.body.style.overflow = "";
    }
    switchModalTab(tabName) {
        document
            .querySelectorAll("#previewModal .nav-link")
            .forEach((btn) => btn.classList.remove("active"));
        document
            .querySelectorAll("#previewModal .tab-pane")
            .forEach((content) => content.classList.remove("active"));
        const selectedTab = document.querySelector(`#previewModal [data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(`${tabName}Tab`);
        if (selectedTab)
            selectedTab.classList.add("active");
        if (selectedContent)
            selectedContent.classList.add("active");
    }
    loadModalContent(card) {
        // Load Summary of changes (diff data from TYPO3 API)
        this.loadSummaryOfChanges(card.id);
        this.loadComments(card.id);
        this.loadHistory(card.id);
    }
    loadSummaryOfChanges(cardId) {
        const changesContainer = document.getElementById("changesContainer");
        if (!changesContainer)
            return;
        const diffData = this.board.data.diffs?.[cardId] || [];
        if (!diffData || diffData.length === 0) {
            changesContainer.innerHTML = '<div class="no-changes"><i class="fas fa-info-circle"></i> No changes detected</div>';
            return;
        }
        // Render diff data from TYPO3 API (already in HTML format)
        changesContainer.innerHTML = diffData
            .map((diff) => `
        <div class="change-item">
          <div class="change-label">${escapeHtml(diff.label)}:</div>
          <div class="change-content">${diff.content}</div>
        </div>
      `)
            .join("");
    }
    loadComments(cardId) {
        const commentsContainer = document.getElementById("commentsContainer");
        if (!commentsContainer)
            return;
        const comments = this.board.getCardComments(cardId);
        // Update the comments count badge with actual number of comments
        const commentsCount = document.getElementById("commentsCount");
        if (commentsCount) {
            commentsCount.textContent = comments.length.toString();
        }
        if (comments.length === 0) {
            commentsContainer.innerHTML = '<div class="no-comments">No comments yet</div>';
            return;
        }
        commentsContainer.innerHTML = comments
            .map((comment) => `
         <div class="comment">
           <div class="comment-avatar">
             ${comment.avatar ? `<img src="${comment.avatar}" alt="${escapeHtml(comment.author)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : getInitials(comment.author)}
           </div>
           <div class="comment-content">
             <div class="comment-header">
               <span class="comment-author">${escapeHtml(comment.author)}</span>
               <span class="comment-time">${formatDate(comment.timestamp)}</span>
             </div>
             <div class="comment-text">${escapeHtml(comment.content)}</div>
           </div>
         </div>
         ${comment.replies
            ? comment.replies
                .map((reply) => `
           <div class="comment reply">
             <div class="comment-avatar">
               ${reply.avatar ? `<img src="${reply.avatar}" alt="${escapeHtml(reply.author)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : getInitials(reply.author)}
             </div>
             <div class="comment-content">
               <div class="comment-header">
                 <span class="comment-author">${escapeHtml(reply.author)}</span>
                 <span class="comment-time">${formatDate(reply.timestamp)}</span>
               </div>
               <div class="comment-text">${escapeHtml(reply.content)}</div>
             </div>
           </div>
         `)
                .join("")
            : ""}
       `)
            .join("");
    }
    loadHistory(cardId) {
        const historyContainer = document.getElementById("historyContainer");
        if (!historyContainer)
            return;
        const history = this.board.getCardHistory(cardId);
        if (history.length === 0) {
            historyContainer.innerHTML = '<div class="no-history"><i class="fas fa-info-circle"></i> No history available</div>';
            return;
        }
        historyContainer.innerHTML = history
            .map((item) => `
         <div class="history-item">
           <div class="history-header">
             <div class="history-avatar">
               ${item.avatar ? `<img src="${item.avatar}" alt="${escapeHtml(item.author)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : getInitials(item.author)}
             </div>
             <div class="history-meta">
               <div class="history-user">${escapeHtml(item.author)}</div>
               <div class="history-date">${item.datetime || formatDate(item.timestamp)}</div>
             </div>
           </div>
           ${item.differences && Array.isArray(item.differences) && item.differences.length > 0 ? `
           <div class="history-differences">
             ${item.differences.map(diff => `
               <div class="history-diff-item">
                 <div class="history-diff-label">${escapeHtml(diff.label)}:</div>
                 <div class="history-diff-content">${diff.html}</div>
               </div>
             `).join('')}
           </div>
           ` : `
           <div class="history-action">${escapeHtml(item.action || 'Updated record')}</div>
           `}
         </div>
       `)
            .join("");
    }
    // Handle adding a new comment
    handleAddComment() {
        const commentTextarea = document.getElementById("newComment");
        const addCommentBtn = document.getElementById("addComment");
        if (!commentTextarea || !addCommentBtn)
            return;
        const commentText = commentTextarea.value.trim();
        if (!commentText) {
            showToast("Please enter a comment", "warning");
            return;
        }
        // Get the current card ID from the modal
        const modalMeta = document.getElementById("modalMeta");
        if (!modalMeta)
            return;
        const cardId = modalMeta.getAttribute('data-id');
        // Find the card by title (you may want to store cardId differently)
        const currentCard = this.board.getCardById(cardId);
        if (!currentCard) {
            showToast("Unable to identify current card", "error");
            return;
        }
        // Disable button and show loading state
        addCommentBtn.disabled = true;
        addCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        // Prepare API request
        const url = this.board.options.getDataApiUrl || this.board.options.apiUrl;
        if (!url) {
            console.error('No API URL configured for adding comments');
            showToast("API URL not configured", "error");
            addCommentBtn.disabled = false;
            addCommentBtn.innerHTML = '<i class="fas fa-comment"></i> Add Comment';
            return;
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
        };
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
                commentTextarea.value = '';
                // Show success message
                showToast("Comment added successfully", "success");
                // Reload comments to show the new one
                this.board.api.fetchCardDetails(currentCard)
                    .then(() => {
                    this.loadComments(currentCard.id);
                })
                    .catch(error => {
                    console.error('Failed to reload comments:', error);
                });
                // Emit event
                this.board.emit("comment:added", currentCard.id, commentText);
            }
            else {
                throw new Error((result && result.message) || "Failed to add comment");
            }
        })
            .catch((error) => {
            console.error("Failed to add comment:", error);
            showToast("Failed to add comment: " + error.message, "error");
        })
            .finally(() => {
            // Re-enable button
            addCommentBtn.disabled = false;
            addCommentBtn.innerHTML = '<i class="fas fa-comment"></i> Add Comment';
        });
    }
    // Open the custom Send to Stage modal
    openSendToStageModal(formData, context) {
        const modal = document.getElementById("sendToStageModal");
        if (!modal)
            return;
        // Store context for submit handler
        this.currentStageFormContext = context;
        this.currentStageFormData = formData;
        // Update UI
        const checklistSection = document.getElementById("stageChecklistSection");
        const checklistList = document.getElementById("stageChecklistList");
        const recipientsGroup = document.getElementById("recipientsGroup");
        const recipientsList = document.getElementById("stageRecipientsList");
        const additionalGroup = document.getElementById("additionalRecipientsGroup");
        const commentsInput = document.getElementById("stageComments");
        const additionalRecipientsInput = document.getElementById("stageAdditionalRecipients");
        const infoBanner = document.getElementById("stageInfoBanner");
        const infoText = document.getElementById("stageInfoText");
        // Render stage checklist (at top of modal)
        if (checklistSection && checklistList) {
            checklistList.innerHTML = "";
            const rawChecklist = context.targetStage?.checklist || [];
            const seenIds = new Set();
            const seenTitles = new Set();
            const checklist = Array.isArray(rawChecklist)
                ? rawChecklist.filter((item) => {
                    const id = item && (item.id ?? item.uid);
                    const title = item && (item.title ?? '').toString().trim();
                    if (id === undefined || seenIds.has(id))
                        return false;
                    if (title !== '' && seenTitles.has(title))
                        return false;
                    seenIds.add(id);
                    if (title !== '')
                        seenTitles.add(title);
                    return true;
                })
                : [];
            if (checklist.length > 0) {
                checklistSection.style.display = "block";
                checklistList.innerHTML =
                    '<ul class="stage-checklist-ul">' +
                        checklist.map((item) => '<li class="stage-checklist-item"><span class="stage-checklist-item-icon"></span>' + escapeHtml(item.title) + '</li>').join('') +
                        '</ul>';
                Icons.getIcon("kanban-workspaces-stage-checklist", Icons.sizes.small).then((markup) => {
                    checklistList.querySelectorAll(".stage-checklist-item-icon").forEach((el) => {
                        el.innerHTML = markup;
                    });
                });
            }
            else {
                checklistSection.style.display = "none";
                checklistList.innerHTML = "";
            }
        }
        // Reset form
        if (commentsInput)
            commentsInput.value = (formData.comments && formData.comments.value) || "";
        if (additionalRecipientsInput)
            additionalRecipientsInput.value = (formData.additional && formData.additional.value) || "";
        // Setup Info Banner
        if (infoBanner && infoText) {
            if (context.targetStage) {
                infoText.textContent = `Sending ${context.cardIds.length > 1 ? context.cardIds.length + ' items' : 'item'} to ${context.targetStage.label}`;
                infoBanner.style.display = "flex";
            }
            else {
                infoBanner.style.display = "none";
            }
        }
        // Render recipients
        if (recipientsList && formData.sendMailTo && formData.sendMailTo.length > 0) {
            recipientsGroup.style.display = "block";
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
                <label for="${recipient.name}">${escapeHtml(recipient.label)}</label>
            </div>
        </div>
      `).join("");
        }
        else {
            if (recipientsGroup)
                recipientsGroup.style.display = "none";
        }
        // Render additional recipients
        if (additionalGroup) {
            additionalGroup.style.display = formData.additional ? "block" : "none";
        }
        // Show modal
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        // Focus comments
        if (commentsInput)
            commentsInput.focus();
    }
    closeSendToStageModal() {
        const modal = document.getElementById("sendToStageModal");
        if (modal) {
            modal.style.display = "none";
            document.body.style.overflow = "";
        }
        // If cancelled and we have context (drag drop), revert
        if (this.currentStageFormContext && this.currentStageFormContext.isDragDrop) {
            this.board.renderer.renderBoard();
        }
        this.currentStageFormContext = null;
        this.currentStageFormData = null;
    }
    async handleSendToStageSubmit() {
        if (!this.currentStageFormContext || !this.currentStageFormData)
            return;
        const { url, executeMethod, cardIds, targetStage } = this.currentStageFormContext;
        const submitBtn = document.getElementById("submitSendToStageBtn");
        // Collect form data
        const comments = document.getElementById("stageComments")?.value || "";
        const additional = document.getElementById("stageAdditionalRecipients")?.value || "";
        // Get checked recipients
        const recipients = [];
        document.querySelectorAll(".t3js-workspace-recipient:checked").forEach((cb) => {
            recipients.push(cb.value);
        });
        // Construct form values object (mimicking Utility.convertFormToObject)
        const formValues = {
            comments: comments,
            recipients: recipients,
            additional: additional,
            affects: this.currentStageFormData.affects
        };
        const executePayload = {
            action: "Actions",
            method: executeMethod,
            data: [formValues]
        };
        // UI Loading state
        if (submitBtn) {
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            try {
                const executeResponse = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    body: JSON.stringify(executePayload),
                });
                if (!executeResponse.ok) {
                    throw new Error(`HTTP error! status: ${executeResponse.status}`);
                }
                const executeResult = await executeResponse.json();
                if (executeResult && executeResult[0]?.result?.success !== false) {
                    // Success
                    if (targetStage) {
                        // The transition was already persisted above via
                        // sendToNextStageExecute/sendToPrevStageExecute (incl. the comment
                        // and recipient data). Reconcile the board locally only; passing
                        // persist=false avoids a second, comment-less
                        // sendToSpecificStageExecute request that would crash in the Core.
                        this.board.cardActions.moveCard(cardIds, targetStage.id, true, false);
                        Notification.success(TYPO3.lang['actionSendToStage'] || 'Send to stage', `Content moved to ${targetStage.label} and notifications sent`);
                    }
                    else {
                        // Refresh if not a drag-drop (revert/next)
                        this.board.loadData();
                        showToast("Action completed successfully", "success");
                    }
                    this.closePreviewModal();
                    // Close send-to-stage modal
                    this.currentStageFormContext = null;
                    const modal = document.getElementById("sendToStageModal");
                    if (modal) {
                        modal.style.display = "none";
                        document.body.style.overflow = "";
                    }
                }
                else {
                    throw new Error(executeResult[0]?.result?.message || "Stage transition failed");
                }
            }
            catch (error) {
                console.error("Failed to execute stage transition:", error);
                showToast("Failed to execute: " + error.message, "error");
                // Revert on error
                this.board.renderer.renderBoard();
            }
            finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }
    async handleRevertStage() {
        const revertBtn = document.getElementById("revertBtn");
        if (!revertBtn)
            return;
        // Get the current card ID from the modal
        const modalMeta = document.getElementById("modalMeta");
        if (!modalMeta)
            return;
        const cardId = modalMeta.getAttribute('data-id');
        // Find the card by ID
        const currentCard = this.board.getCardById(cardId);
        if (!currentCard) {
            showToast("Unable to identify current card", "error");
            return;
        }
        // Prepare API request
        const url = this.board.options.getDataApiUrl || this.board.options.apiUrl;
        if (!url) {
            console.error('No API URL configured for stage transition');
            showToast("API URL not configured", "error");
            return;
        }
        // Step 1: Fetch stage form data by calling sendToPrevStageWindow
        const windowPayload = {
            action: "Actions",
            method: "sendToPrevStageWindow",
            data: [currentCard.uid, currentCard.table]
        };
        try {
            const windowResponse = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify(windowPayload),
            });
            const windowResult = await windowResponse.json();
            if (!windowResult || windowResult.length === 0 || !windowResult[0].result) {
                throw new Error("Invalid response from sendToPrevStageWindow");
            }
            const formData = windowResult[0].result;
            const currentIndex = this.board.data.stages.findIndex((s) => s.id == currentCard.stage || s.id === currentCard.stage);
            const targetStage = currentIndex > 0 ? this.board.data.stages[currentIndex - 1] : null;
            this.openSendToStageModal(formData, {
                url: url,
                executeMethod: "sendToPrevStageExecute",
                cardIds: [currentCard.id],
                targetStage: targetStage,
                isDragDrop: false
            });
        }
        catch (error) {
            console.error("Failed to load stage form:", error);
            showToast("Failed to load stage form: " + error.message, "error");
        }
    }
    async handleNextStage() {
        const approveBtn = document.getElementById("approveBtn");
        if (!approveBtn)
            return;
        // Get the current card ID from the modal
        const modalMeta = document.getElementById("modalMeta");
        if (!modalMeta)
            return;
        const cardId = modalMeta.getAttribute('data-id');
        // Find the card by ID
        const currentCard = this.board.getCardById(cardId);
        if (!currentCard) {
            showToast("Unable to identify current card", "error");
            return;
        }
        // Prepare API request
        const url = this.board.options.getDataApiUrl || this.board.options.apiUrl;
        if (!url) {
            console.error('No API URL configured for stage transition');
            showToast("API URL not configured", "error");
            return;
        }
        // Step 1: Fetch stage form data by calling sendToNextStageWindow
        const windowPayload = {
            action: "Actions",
            method: "sendToNextStageWindow",
            data: [currentCard.uid, currentCard.table, currentCard.t3ver_oid]
        };
        try {
            const windowResponse = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify(windowPayload),
            });
            const windowResult = await windowResponse.json();
            if (!windowResult || windowResult.length === 0 || !windowResult[0].result) {
                throw new Error("Invalid response from sendToNextStageWindow");
            }
            const formData = windowResult[0].result;
            const currentIndex = this.board.data.stages.findIndex((s) => s.id == currentCard.stage || s.id === currentCard.stage);
            const targetStage = currentIndex >= 0 && currentIndex < this.board.data.stages.length - 1
                ? this.board.data.stages[currentIndex + 1]
                : null;
            this.openSendToStageModal(formData, {
                url: url,
                executeMethod: "sendToNextStageExecute",
                cardIds: [currentCard.id],
                targetStage: targetStage,
                isDragDrop: false
            });
        }
        catch (error) {
            console.error("Failed to load stage form:", error);
            showToast("Failed to load stage form: " + error.message, "error");
        }
    }
}
