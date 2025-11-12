# Kanban Workspaces - TYPO3 Extension

A modern Kanban Board extension for TYPO3 v13 with backend module support.

## Features

- TYPO3 v13 compatible backend module
- Integrated page tree navigation
- Drag & drop kanban board interface
- Modern responsive design
- Composer-based installation

## Installation

1. Install via Composer:
   ```bash
   composer require devzspace/kanban-workspaces
   ```

2. Activate the extension in the Extension Manager

3. Include the TypoScript template "Kanban Workspaces Backend Module"

## Backend Module

The extension provides a backend module accessible under:
- **Web > Kanban Workspaces**

### Features:
- Page tree integration for context-aware kanban boards
- Three default columns: To Do, In Progress, Done
- AJAX-based card management
- Drag & drop support

## File Structure

```
kanban_workspaces/
├── Classes/
│   └── Controller/
│       └── KanbanWorkspacesController.php
├── Configuration/
│   ├── Backend/
│   │   └── Modules.php              # TYPO3 v13 module registration
│   ├── Services.yaml                  # Dependency injection
│   └── TypoScript/
│       ├── constants.typoscript
│       └── setup.typoscript
├── Resources/
│   ├── Private/
│   │   ├── Language/
│   │   │   ├── locallang.xlf
│   │   │   └── locallang_mod.xlf
│   │   ├── Layouts/
│   │   │   └── Module.html
│   │   └── Templates/
│   │       └── KanbanWorkspaces/
│   │           └── Backend/
│   │               └── Main.html
│   └── Public/
│       ├── Css/
│       │   └── Backend.css
│       ├── Icons/
│       │   └── module-icon.svg
│       └── JavaScript/
│           └── Backend.js
├── composer.json
├── ext_emconf.php
├── ext_localconf.php
└── ext_tables.php
```

## TYPO3 v13 Compatibility

This extension follows TYPO3 v13 best practices:

- Uses `Configuration/Backend/Modules.php` for module registration
- Implements proper dependency injection via `Services.yaml`
- Uses modern Extbase ActionController structure
- Follows PSR-4 autoloading standards
- Compatible with TYPO3 v13.0-13.4

## Development

### Backend Module Structure

The backend module is registered in `Configuration/Backend/Modules.php` and provides:

- Multiple controller actions for different operations
- AJAX endpoints for dynamic updates
- Page tree integration
- Module data persistence

### Controller Actions

- `indexAction()` - Main kanban board view
- `showAction()` - Show specific page kanban
- `createAction()` - Create new card (AJAX)
- `updateAction()` - Update card (AJAX) 
- `moveCardAction()` - Move card between columns (AJAX)
- `ajaxUpdateAction()` - Generic AJAX handler

## License

GPL-2.0-or-later

## Author

Devzspace (info@devzspace.com)