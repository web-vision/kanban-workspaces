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
/**
 * Drag-to-scroll behaviour for the horizontal kanban board.
 *
 * Lets the user grab empty area of the workspace main region and pan the board
 * sideways (mouse and touch). Dragging that starts on a card or column is
 * ignored so it does not interfere with card drag-and-drop.
 *
 * Call once after the board markup is present; it is a no-op when the expected
 * elements are missing.
 */
export function initHorizontalScroll() {
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    const main = document.querySelector('.workspace-main');
    const board = document.getElementById('kanbanBoard');
    if (!main || !board)
        return;
    // Only allow drag-to-scroll if mousedown is on empty main area (not on a card or column)
    main.addEventListener('mousedown', function (e) {
        // Only left mouse button
        if (e.button !== 0)
            return;
        // Ignore if clicking on a card, column, or any child of kanban-board
        if (e.target.closest('.kanban-column, .kanban-card'))
            return;
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
        if (!isDragging)
            return;
        const x = e.pageX;
        board.scrollLeft = scrollLeft - (x - startX);
    });
    // Touch support
    let touchStartX = 0;
    let touchScrollLeft = 0;
    main.addEventListener('touchstart', function (e) {
        if (e.target.closest('.kanban-column, .kanban-card'))
            return;
        isDragging = true;
        touchStartX = e.touches[0].pageX - board.scrollLeft;
        touchScrollLeft = board.scrollLeft;
    });
    main.addEventListener('touchend', function () {
        isDragging = false;
    });
    main.addEventListener('touchmove', function (e) {
        if (!isDragging)
            return;
        const x = e.touches[0].pageX;
        board.scrollLeft = touchScrollLeft - (x - touchStartX);
    });
}
