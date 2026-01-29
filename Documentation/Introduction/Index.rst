.. include:: /Includes.rst.txt

============
Introduction
============

What does this extension do?
============================

The Kanban Workspaces extension brings a modern, intuitive Kanban board interface to TYPO3's workspace management system. It provides content editors and managers with a visual, drag-and-drop workflow for managing content through different publishing stages.

Key Features
============

* **Kanban Board Interface** - Visual drag-and-drop kanban board for workspace stage management
* **Stage-based Workflow** - Organize content items across customizable workflow stages
* **Multi-language Support** - Filter and manage content across multiple site languages
* **Hierarchical Depth Control** - View content at different page tree depths (single page to infinite levels)
* **TYPO3 v13 Compatibility** - Built with modern TYPO3 v13 architecture and best practices
* **Backend Module Integration** - Seamlessly integrated into TYPO3's web module navigation
* **Workspace Integration** - Full integration with TYPO3's native workspace functionality
* **Dynamic Stage Configuration** - Configure custom stages and disable default stages as needed
* **Responsive Design** - Works on desktop and tablet interfaces

What is Kanban Workflow?
========================

Kanban is a lean workflow management methodology that visualizes work as cards moving across different stages. In TYPO3 context:

* **Stages** - Different states in your publishing workflow (e.g., "Draft", "Review", "Approved", "Published")
* **Cards** - Individual content items (pages, content elements) that move through stages
* **Workflow** - Visual representation of your content approval and publishing process
* **Transparency** - Everyone can see what's in each stage at a glance

The Kanban approach helps teams:

* Visualize content workflow and bottlenecks
* Manage content review and approval processes
* Coordinate between editors and approvers
* Track content publication status
* Improve editorial workflow efficiency

Use Cases
=========

**Editorial Teams**
  Manage article publishing workflows with clear stages for draft, review, editing, and publication.

**Content Approval Systems**
  Implement multi-stage approval workflows where content moves through different approval levels before publication.

**Multi-language Websites**
  Manage content translations across different languages with stage-based workflows for each language variant.

**Large Content Operations**
  Organize hundreds or thousands of content items into manageable workflow stages with filtering by depth and language.

**Agile Content Management**
  Apply agile principles to content management with visual workflow boards and iterative publishing processes.

System Requirements
===================

* **TYPO3 v13.4.0 or higher** - Requires TYPO3 v13.4 LTS or compatible versions
* **PHP 8.2.0 or higher** - PHP 8.2 or 8.3 with standard TYPO3 extensions
* **Backend Workspace Access** - Users must have workspace access enabled
* **Workspaces Extension** - Requires core TYPO3 workspaces functionality (included by default)

Supported Features
==================

* Drag-and-drop stage transitions
* Language-based content filtering
* Page tree depth selection
* Stage filtering by type
* Automatic stage configuration from workspace settings
* Custom stage color coding
* Edit and delete permissions per stage
