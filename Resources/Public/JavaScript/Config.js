/**
 * Global Configuration for TYPO3 Workspace Board
 * This file defines mock data and configuration settings for the board.
 * In a real application, this data would typically come from a backend API.
 */
let defaultAvatarUrl = document.getElementsByClassName("module")[0]?.getAttribute("data-avatar") || "";
window.WorkspaceConfig = {
  // Mock API endpoints (for demonstration purposes)
  apiEndpoints: {
    cards: "/api/cards",
    move: "/api/move-card",
    assignUser: "/api/assign-user",
    workspace: "/api/workspace",
    stages: "/api/stages", // New endpoint for stage CRUD
  },

  // Mock user data
  users: [
    { id: "john", name: "John Doe", role: "Editor", avatar: defaultAvatarUrl },
    { id: "jane", name: "Jane Smith", role: "Admin", avatar: defaultAvatarUrl },
    { id: "mike", name: "Mike Johnson", role: "Reviewer", avatar: defaultAvatarUrl },
    { id: "sarah", name: "Sarah Wilson", role: "Editor", avatar: defaultAvatarUrl},
    { id: "tom", name: "Tom Brown", role: "Guest", avatar: defaultAvatarUrl},
  ],

  // Mock stage assignments (users assigned to a stage, not cards)
  stageAssignments: {
    draft: ["john", "mike"],
    review: ["jane"],
    ready: ["sarah"],
    published: ["john", "jane"],
    "on-hold": ["tom"],
  },
}
