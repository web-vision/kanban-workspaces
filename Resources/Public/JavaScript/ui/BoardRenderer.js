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
import { escapeHtml, getTypeIcon, formatDate, renderT3Icon } from '@web-vision/kanban-workspaces/core/utils.js';
/**
 * Renders the board: columns, cards and the filter sidebar. Owns all markup
 * generation and reads its data from the owning board. Drag-and-drop wiring is
 * delegated back to the board's {@link DragController} after a render.
 */
export class BoardRenderer {
    board;
    constructor(board) {
        this.board = board;
    }
    // Render the entire board (columns, filters and responsive UI state).
    render() {
        this.renderBoard();
        this.renderFilters();
        this.updateUI();
    }
    // Render the kanban columns and (re)attach drag-and-drop.
    renderBoard() {
        const boardContainer = document.getElementById("kanbanBoard");
        if (!boardContainer)
            return;
        boardContainer.innerHTML = "";
        // Sort stages by order
        const sortedStages = [...this.board.data.stages].sort((a, b) => a.order - b.order);
        sortedStages.forEach((stage) => {
            const column = this.createColumn(stage);
            boardContainer.appendChild(column);
        });
        // Setup drag and drop AFTER columns are added to DOM
        if (this.board.options.enableDragDrop) {
            this.board.drag.setupDragAndDrop();
        }
        // Emit board:rendered after board is fully rendered
        this.board.emit("board:rendered", this.board);
    }
    // Create a column element with enhanced UI
    createColumn(stage) {
        const column = document.createElement("div");
        column.className = `kanban-column stage-${stage.id}`;
        column.dataset.stageId = stage.id;
        // Get cards for this stage, apply global filters first
        let cardsForStage = this.getFilteredCards().filter((card) => card.stage === stage.id);
        // Apply column-specific user filter if active
        const activeColumnUserFilter = this.board.data.columnUserFilters[stage.id];
        if (activeColumnUserFilter) {
            cardsForStage = cardsForStage.filter((card) => (card.assignedUsers || []).includes(activeColumnUserFilter));
        }
        // Apply column-specific sort if active
        const activeColumnSort = this.board.data.columnSorts[stage.id];
        if (activeColumnSort === "modifiedDate") {
            cardsForStage.sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime());
        }
        column.innerHTML = `
       <div class="column-header">
           <div class="column-title-row">
               <div class="column-title-main">
                   <div class="stage-indicator" style="background-color: ${stage.color || 'var(--typo3-orange)'}"></div>
                   <span class="column-name">${escapeHtml(stage.label)}</span>
                   <span class="column-count">${cardsForStage.length}</span>
               </div>
               <div class="column-actions"></div>
           </div>
       </div>
       <div class="column-content" data-stage-id="${stage.id}">
           ${cardsForStage.length === 0
            ? '<div class="column-empty">No items in this stage</div>'
            : cardsForStage.map((card) => this.createCardHTML(card)).join("")}
       </div>
     `;
        return column;
    }
    // Create card HTML
    createCardHTML(card) {
        const typeIcon = getTypeIcon(card.type);
        const formattedDate = formatDate(card.modifiedDate);
        const priorityClass = card.priority ? `priority-${card.priority}` : "";
        const selectedClass = this.board.ui.selectedCards.has(card.id) ? "selected" : "";
        // Generate integrity indicator
        const integrityHTML = this.generateIntegrityHTML(card);
        // Generate due date if exists
        const dueDateHTML = card.dueDate
            ? `<div class="card-due-date ${this.isDueDateOverdue(card.dueDate) ? "overdue" : ""}">
           <i class="fas fa-calendar-alt"></i>
           <span>${formatDate(card.dueDate)}</span>
         </div>`
            : "";
        // Generate attachments indicator
        const attachmentsHTML = card.attachments && card.attachments.length > 0
            ? `<div class="card-attachments">
           <i class="fas fa-paperclip"></i>
           <span>${card.attachments.length}</span>
         </div>`
            : "";
        // Assignee(s) on card: card.assignee or card.assignedUsers; show avatar image if available
        const assignees = card.assignee ? [card.assignee] : (card.assignedUsers || []);
        const assignedUsersHTML = assignees.length > 0
            ? `<div class="card-assignees">${assignees.map((u) => {
                const title = escapeHtml(u.username || 'UID ' + u.uid);
                const initial = (u.username || 'U' + u.uid).charAt(0).toUpperCase();
                if (u.avatar_url) {
                    return `<span class="user-avatar" title="${title}"><img src="${escapeHtml(u.avatar_url)}" alt="${title}" loading="lazy" onerror="this.style.display='none';var s=this.nextElementSibling;if(s)s.style.display='flex';" /><span class="user-avatar-initial" style="display:none">${initial}</span></span>`;
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

           <h4 class="card-title">${escapeHtml(card.title)}</h4>

           <div class="card-meta">
               <div class="card-meta-row">
                   <span class="card-uid">UID: ${card.uid}</span>
                   <span class="card-page">${escapeHtml(card.pageName)}</span>
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
            : ""}
               ${dueDateHTML}
           </div>
           <div class="card-footer">
               <div class="card-language">
                   ${renderT3Icon(card.language.icon)} ${card.languageCode.toUpperCase()}
               </div>
               ${assignedUsersHTML}
               <div class="card-stats">
                   ${card.comments > 0
            ? `<div class="card-comments">
                           <i class="fas fa-comment"></i>
                           <span>${card.comments}</span>
                       </div>`
            : ""}
               </div>
           </div>
       </div>
     `;
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
           title="${escapeHtml(messages)}">
        <i class="fas ${icon}"></i>
        <span class="integrity-label">${label}</span>
      </div>
    `;
    }
    // Get filtered cards (global filters only)
    getFilteredCards() {
        let cards = [...this.board.data.cards];
        return cards;
    }
    // Render filter sidebar
    renderFilters() {
        const filterGroups = document.getElementById("filterGroups");
        if (!filterGroups)
            return;
        filterGroups.innerHTML = "";
        Object.entries(this.board.data.filters).forEach(([filterType, filterConfig]) => {
            const group = document.createElement("div");
            group.className = "filter-group";
            // Special handling for depth, language, and stage filters - render as selectbox
            if (filterType === 'depth' || filterType === 'language' || filterType === 'stage') {
                // Get current selected value
                let selectedValue;
                if (filterType === 'depth') {
                    selectedValue = this.board.data.activeFilters.depth && this.board.data.activeFilters.depth.length > 0
                        ? this.board.data.activeFilters.depth[0]
                        : '0';
                }
                else if (filterType === 'language') {
                    selectedValue = this.board.data.activeFilters.language && this.board.data.activeFilters.language.length > 0
                        ? this.board.data.activeFilters.language[0]
                        : 'all';
                }
                else if (filterType === 'stage') {
                    selectedValue = this.board.data.activeFilters.stage && this.board.data.activeFilters.stage.length > 0
                        ? this.board.data.activeFilters.stage[0]
                        : '-99';
                }
                // Add "All" option for language and stage filters
                let allOption = '';
                if (filterType === 'language') {
                    allOption = '<option value="all">All Languages</option>';
                }
                else if (filterType === 'stage') {
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
                    .map((option) => `
                 <option value="${option.id}" ${option.id == selectedValue ? 'selected' : ''}>
                   ${option.flag ? option.flag + ' ' : ''}${escapeHtml(option.label)}
                 </option>
               `)
                    .join("")}
             </select>
           </div>
         </div>
       `;
            }
            else {
                // Render other filters as checkboxes
                group.innerHTML = `
         <h3 class="filter-group-title">${filterConfig.label}</h3>
         <div class="filter-options">
           ${filterConfig.options
                    .map((option) => `
               <div class="filter-option">
                   <input type="checkbox"
                          id="filter-${filterType}-${option.id}"
                          data-filter-type="${filterType}"
                          data-filter-value="${option.id}"
                          ${this.board.filters.isFilterActive(filterType, option.id) ? "checked" : ""}>
                   <label for="filter-${filterType}-${option.id}">
                       ${option.icon ? `<i class="${option.icon}"></i>` : ""}
                       ${option.flag ? option.flag : ""}
                       ${escapeHtml(option.label)}
                   </label>
               </div>
           `)
                    .join("")}
         </div>
       `;
            }
            filterGroups.appendChild(group);
        });
        // Setup filter event listeners for checkboxes
        const checkboxes = filterGroups.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener("change", (e) => {
                const target = e.target;
                const filterType = target.dataset.filterType;
                const filterValue = target.dataset.filterValue;
                const isActive = target.checked;
                this.board.emit("filter:change", filterType, filterValue, isActive);
            });
        });
        // Setup filter event listeners for selectboxes (depth, language, stage filters)
        const selects = filterGroups.querySelectorAll('select.filter-select');
        selects.forEach((select) => {
            // Ensure the select is focusable and clickable
            select.setAttribute('tabindex', '0');
            // Add both change and click listeners to ensure interaction
            select.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent any parent handlers from interfering
            });
            select.addEventListener("change", (e) => {
                e.stopPropagation(); // Prevent event bubbling
                const target = e.target;
                const filterType = target.dataset.filterType;
                const filterValue = target.value;
                // Clear previous filter first
                if (this.board.data.activeFilters[filterType]) {
                    delete this.board.data.activeFilters[filterType];
                }
                this.board.emit("filter:change", filterType, filterValue, true);
            });
            // Add mousedown listener to ensure dropdown opens
            select.addEventListener("mousedown", (e) => {
                e.stopPropagation(); // Prevent any parent handlers from interfering
            });
        });
        // Clear all filters button
        const clearAllFilters = document.getElementById("clearAllFilters");
        if (clearAllFilters) {
            clearAllFilters.addEventListener("click", () => {
                this.board.emit("filter:clear");
            });
        }
    }
    updateUI() {
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle("mobile", isMobile);
    }
}
