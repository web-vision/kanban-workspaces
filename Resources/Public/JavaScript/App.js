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
// Entry point for the Kanban Workspaces backend module.
//
// It registers the board web components by importing the root component (which
// in turn imports its children). The board itself is placed declaratively in
// the module's Fluid template as `<typo3-kanban-board>` and initialises itself
// from `window.WorkspaceConfig` when it is connected to the DOM.
import '@web-vision/kanban-workspaces/components/board.js';
