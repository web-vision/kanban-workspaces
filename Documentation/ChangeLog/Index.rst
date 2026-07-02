..  _changelog:

=========
ChangeLog
=========

Version [UNRELEASED]
====================

Version 0.0.2
=============

New Features
------------

* **Disable reset to editing stage** – New extension configuration option ``disableResetToEditingStage``; when enabled
  it prevents TYPO3's DataHandler from resetting a workspace record's stage back to the editing stage (stage 0) after
  a field update.
* **Custom titles for default stages** – New extension configuration options ``customStageEditTitle``,
  ``customStageReadyToPublishTitle`` and ``customStagePublishTitle`` to override the titles of the default TYPO3
  workspace stages (Editing, Ready to publish, Publish). Each accepts a plain string or a ``LLL:EXT:...`` translation
  reference; empty keeps the TYPO3 default. Implemented by extending ``StagesService::getStageTitle()``.

Breaking / Removed
------------------

* **Disable default stage and Default StageId** - Disabling default stage (`editing`) and configure a default custom
  stage id to use has been removed; Removing default stage `editing` is not reasonable and the `Default Custom Stage Id`
  needs to be done on workspace level because multiple workspaces does not have the same custom stage at all. Removed
  for now and postponed to be added in more workable stage at a later point.

Version 0.0.1
=============

**Initial Release**

This is the first stable release of the Kanban Workspaces extension for TYPO3 as preview/experimental alpha version.

Supported Versions
------------------

* TYPO3: 13.4.0+ (v13 LTS) && 14.3.0+ (v14 LTS)
* PHP: 8.2.0 to 8.5.99
* Browsers: TYPO3 Backend policy, last two supported versions of (Chrome, Firefix, Safari)

New Features
------------

* **Checklist items per stage** – In Admin Tools > Workspaces, edit a workspace and expand a custom stage; add, reorder, or remove checklist entries in the "Checklist items" inline section.
* **Checklist in Send to Stage modal** – When moving a card to a stage, the modal shows that stage's checklist (list with icon per item) below the info banner; empty stages show no checklist section.
* **Assign user to card** – Card context menu (⋯) → **Assign** opens a modal to set Title (optional), Description (optional), and Assignee (required; select from backend user list).
* **Assignee on card** – Each card shows the assignee in the footer (avatar image from FAL when available, otherwise user initial).
* **Assignment notification email** – When you assign a **different** user (not yourself) with a valid email, that user receives an email (Fluid templates, SystemEmail layout).
* **Cleanup on publish** – When a record is published via TYPO3 workspace publish, assignment rows for that record/workspace are removed automatically.
* **Kanban Board Interface** - Visual drag-and-drop interface for workspace stage management
* **Multi-stage Workflow Support** - Support for custom workspace stages with drag-and-drop transitions
* **Depth-based Content Filtering** - Filter displayed content by page tree depth (0-4 levels or infinite)
* **Multi-language Support** - Filter content by system languages (all languages, specific languages)
* **Stage-based Filtering** - Show items from specific workflow stages
* **Backend Module Integration** - Integrated into TYPO3 Web module with proper navigation
* **Dynamic Stage Configuration** - Auto-configuration from workspace settings
* **TYPO3 v13 Compatibility** - Full support for TYPO3 v13.4.0+ LTS
* **Persistent Filter State Per User** - User filter preferences are automatically saved and restored on subsequent visits
* **Bulk Stage Transitions** - Drag-and-drop functionality for moving multiple items between workflow stages simultaneously

Technical Details
-----------------

* **Framework:** TYPO3 v13.4.0+ && TYPO3 v14.3.0+
* **PHP:** PHP 8.2.0+
* **Architecture:** Modern TYPO3 service container, dependency injection
* **Code Quality:** PSR-12 compliant, full type declarations, TYPO3 coding standards
* **Documentation:** Comprehensive documentation for administrators, editors, and developers
* **Table:** ``tx_kanbanworkspaces_stage_checklist`` – stores stage (FK to ``sys_workspace_stage``), title, sorting (see ``ext_tables.sql``).
* **TCA:** ``Configuration/TCA/tx_kanbanworkspaces_stage_checklist.php``; ``Configuration/TCA/Overrides/sys_workspace_stage.php`` adds ``checklist_items`` inline to workspace stage form.
* **Icons:** ``Configuration/Icons.php`` registers ``kanban-workspaces-stage-checklist`` (``Resources/Public/Icons/checklist.svg``) for TCA and modal list items.
* **Controller:** ``KanbanWorkspacesController::getChecklistForStage()`` loads and deduplicates items; stage config passed to frontend includes ``checklist`` array per stage.
* **Frontend:** ``ui/ModalController.js`` renders checklist in ``openSendToStageModal``; ``targetStage`` passed from approve/revert handlers so checklist and banner show for the correct stage.
* **Table:** ``sys_workspaces_assignee`` – stores assignee (be_user), table_name, record_uid, workspace_id, stage_id, title, description (see ``ext_tables.sql``).
* **TCA:** ``t3ver_assignee`` column added to all versioned tables (references ``sys_workspaces_assignee``); see ``Configuration/TCA/Overrides/t3ver_assignee.php``.
* **Ajax route:** ``kanban_workspace_assign`` (path ``/kanban-workspace/assign``) → ``AssignAjaxController::assignAction``; see ``Configuration/Backend/AjaxRoutes.php``.
* **Services:** ``AssigneeMappingService`` (persist/cleanup), ``AssignmentNotificationService`` (email); both public in ``Configuration/Services.yaml``.
* **Event listeners:** ``AssigneeEnrichmentListener`` (``AfterDataGeneratedForWorkspaceEvent`` – enriches workspace data with assignee/avatar); ``AssigneeCleanupAfterPublishListener`` (``AfterRecordPublishedEvent`` – cleanup).
* **Email templates:** ``Resources/Private/Templates/Email/AssignmentNotification.html`` and ``AssignmentNotification.txt``; MAIL config (e.g. ``defaultMailFromAddress``, transport) required for sending.

Documentation
-------------

* **Administrator:** Stage Checklist (Workspace Stages) – where and how to configure checklist items; see :ref:`Administrator <administrator>`.
* **Administrator Guide** - Installation, configuration, access control, troubleshooting; see :ref:`Administrator <administrator>`.
* **Configuration:** MAIL and Ajax route configuration for assignment emails; see :ref:`Configuration <configuration>`.
* **Configuration Guide** - All configuration options, TypoScript, service configuration
* **Editor:** Stage checklist in the Send to Stage modal – when it appears and what you see; see :ref:`Editor <editor>`.
* **Editor:** :ref:`Editor > AssignUser <administrator-assignuser>` – flow, email notification, avatar display, testing, troubleshooting.
* **Editor Guide** - Using the kanban board, workflow management, best practices
* **Developer:** Stage Checklist feature (implementation) – TCA, controller, JS, CSS, data model; see :ref:`Developer <developer>`.
* **Developer:** Assign feature implementation (controllers, services, listeners, DB, TCA); see :ref:`Developer <developer>`.
* **Developer Guide** - Architecture, API reference, extending the extension
* **Known Problems** - Known issues, limitations, workarounds, reporting bugs

Installation & Setup
--------------------

* Composer-based installation via ``web-vision/kanban-workspaces``
* Automatic backend module registration
* Zero-configuration default setup
* Optional Extension Manager settings for customization

Backend Module Features
-----------------------

* Located at: Web > Kanban Workspaces
* Available to all workspace-enabled backend users
* Supports multiple workspaces simultaneously
* Respects TYPO3 access control and workspace permissions
* Responsive stage display with color coding
* Filter controls for depth, language, and stage
* Automatic asset loading (CSS, JavaScript modules)

JavaScript Module System
------------------------

* Uses TYPO3's modern ES6 module system
* Loads main app module: ``@web-vision/kanban-workspaces/App.js``
* Modular architecture: ``App.js`` (entry point) instantiates the ``WorkspaceBoard`` orchestrator
  (``WorkspaceBoard.js``), which delegates to focused collaborators under ``core/`` (event emitter,
  horizontal scroll, utilities), ``data/`` (``WorkspaceApi``, ``DataTransformer``) and ``ui/``
  (``BoardRenderer``, ``DragController``, ``ModalController``, ``FilterController``, ``CardActions``)
* Integrates with TYPO3 workspaces send-to-stage functionality
* Asynchronous module loading for optimal performance

Performance Optimizations
-------------------------

* Efficient database queries through TYPO3 repositories
* Lazy loading of workspace data
* Client-side filtering for quick response
* Respects workspace context automatically
* Optimized asset loading strategy

Workspace Integration
---------------------

* Full integration with TYPO3 core workspaces
* Supports all workspace stages and transitions
* Respects workspace edit/delete permissions per stage
* Automatic stage configuration from workspace settings
* Event listener for stage assignment on record generation

Known Limitations
-----------------

* Module only visible in active workspaces (not in Live workspace)
* Requires modern browser with ES6+ support (IE11 not supported)
* Maximum practical depth of ~4-5 levels for optimal performance
* Desktop-optimized interface (mobile support planned)
* Respects TYPO3 core workspace limitations
