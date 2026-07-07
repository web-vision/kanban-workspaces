// Entry point for the Kanban Workspaces backend module.
//
// It registers the board web components by importing the root component (which
// in turn imports its children). The board itself is placed declaratively in
// the module's Fluid template as `<typo3-kanban-board>` and initialises itself
// from `window.WorkspaceConfig` when it is connected to the DOM.
import '@web-vision/kanban-workspaces/components/board.js';
