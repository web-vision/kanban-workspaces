/**
 * Global Configuration for TYPO3 Workspace Board
 * This file defines mock data and configuration settings for the board.
 * In a real application, this data would typically come from a backend API.
 */
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
    { id: "john", name: "John Doe", role: "Editor", avatar: "https://avatar.iran.liara.run/public/31" },
    { id: "jane", name: "Jane Smith", role: "Admin", avatar: "https://avatar.iran.liara.run/public/30" },
    { id: "mike", name: "Mike Johnson", role: "Reviewer", avatar: "https://avatar.iran.liara.run/public/38" },
    { id: "sarah", name: "Sarah Wilson", role: "Editor", avatar: "https://avatar.iran.liara.run/public/1" },
    { id: "tom", name: "Tom Brown", role: "Guest", avatar: "https://avatar.iran.liara.run/public/2" },
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
