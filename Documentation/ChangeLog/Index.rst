.. include:: /Includes.rst.txt

=========
ChangeLog
=========

Version 1.2.0 (2025-02-28)
==========================

**Stage Checklist feature**

This release adds optional per-stage checklists for workspace stages. Administrators can define checklist items in the workspace stage form; when editors move a card to that stage (drag-and-drop or Approve/Revert), the "Send to Stage" modal shows the checklist at the top. The checklist is display-only (no checkboxes or submission).

New Features
------------

* **Checklist items per stage** – In Admin Tools > Workspaces, edit a workspace and expand a custom stage; add, reorder, or remove checklist entries in the "Checklist items" inline section.
* **Checklist in Send to Stage modal** – When moving a card to a stage, the modal shows that stage's checklist (list with icon per item) below the info banner; empty stages show no checklist section.

Technical Details
-----------------

* **Table:** ``tx_kanbanworkspaces_stage_checklist`` – stores stage (FK to ``sys_workspace_stage``), title, sorting (see ``ext_tables.sql``).
* **TCA:** ``Configuration/TCA/tx_kanbanworkspaces_stage_checklist.php``; ``Configuration/TCA/Overrides/sys_workspace_stage.php`` adds ``checklist_items`` inline to workspace stage form.
* **Icons:** ``Configuration/Icons.php`` registers ``kanban-workspaces-stage-checklist`` (``Resources/Public/Icons/checklist.svg``) for TCA and modal list items.
* **Controller:** ``KanbanWorkspacesController::getChecklistForStage()`` loads and deduplicates items; stage config passed to frontend includes ``checklist`` array per stage.
* **Frontend:** ``Workspace.js`` renders checklist in ``openSendToStageModal``; ``targetStage`` passed from approve/revert handlers so checklist and banner show for the correct stage.

Documentation
-------------

* **Administrator:** Stage Checklist (Workspace Stages) – where and how to configure checklist items; see :doc:`Administrator/Index`.
* **Editor:** Stage checklist in the Send to Stage modal – when it appears and what you see; see :doc:`Editor/Index`.
* **Developer:** Stage Checklist feature (implementation) – TCA, controller, JS, CSS, data model; see :doc:`Developer/Index`.

Version 1.1.0 (2025-02-08)
==========================

**Assignment feature**

This release adds the ability to assign a backend user to a workspace record (card) on the kanban board, with optional title and description, assignee display (including avatar), email notification to the assignee, and automatic cleanup of assignment data when the record is published.

New Features
------------

* **Assign user to card** – Card context menu (⋯) → **Assign** opens a modal to set Title (optional), Description (optional), and Assignee (required; select from backend user list).
* **Assignee on card** – Each card shows the assignee in the footer (avatar image from FAL when available, otherwise user initial).
* **Assignment notification email** – When you assign a **different** user (not yourself) with a valid email, that user receives an email (Fluid templates, SystemEmail layout).
* **Cleanup on publish** – When a record is published via TYPO3 workspace publish, assignment rows for that record/workspace are removed automatically.

Technical Details
-----------------

* **Table:** ``sys_workspaces_assignee`` – stores assignee (be_user), table_name, record_uid, workspace_id, stage_id, title, description (see ``ext_tables.sql``).
* **TCA:** ``t3ver_assignee`` column added to all versioned tables (references ``sys_workspaces_assignee``); see ``Configuration/TCA/Overrides/t3ver_assignee.php``.
* **Ajax route:** ``kanban_workspace_assign`` (path ``/kanban-workspace/assign``) → ``AssignAjaxController::assignAction``; see ``Configuration/Backend/AjaxRoutes.php``.
* **Services:** ``AssigneeMappingService`` (persist/cleanup), ``AssignmentNotificationService`` (email); both public in ``Configuration/Services.yaml``.
* **Event listeners:** ``AssigneeEnrichmentListener`` (``AfterDataGeneratedForWorkspaceEvent`` – enriches workspace data with assignee/avatar); ``AssigneeCleanupAfterPublishListener`` (``AfterRecordPublishedEvent`` – cleanup).
* **Email templates:** ``Resources/Private/Templates/Email/AssignmentNotification.html`` and ``AssignmentNotification.txt``; MAIL config (e.g. ``defaultMailFromAddress``, transport) required for sending.

Documentation
-------------

* **Editor:** :doc:`Editor/AssignUser` – flow, email notification, avatar display, testing, troubleshooting.
* **Configuration:** MAIL and Ajax route configuration for assignment emails; see :doc:`Configuration/Index`.
* **Developer:** Assign feature implementation (controllers, services, listeners, DB, TCA); see :doc:`Developer/Index`.

Version 1.0.0 (2025-01-29)
==========================

**Initial Release**

This is the first stable release of the Kanban Workspaces extension for TYPO3.

New Features
------------

* **Kanban Board Interface** - Visual drag-and-drop interface for workspace stage management
* **Multi-stage Workflow Support** - Support for custom workspace stages with drag-and-drop transitions
* **Depth-based Content Filtering** - Filter displayed content by page tree depth (0-4 levels or infinite)
* **Multi-language Support** - Filter content by system languages (all languages, specific languages)
* **Stage-based Filtering** - Show items from specific workflow stages
* **Backend Module Integration** - Integrated into TYPO3 Web module with proper navigation
* **Dynamic Stage Configuration** - Auto-configuration from workspace settings
* **Configurable Default Stages** - Option to disable default TYPO3 stages (stage 0)
* **Custom Default Stage** - Set which stage new records are assigned to
* **Event Listener Support** - AfterDataGeneratedForWorkspaceEvent listener for stage management
* **TYPO3 v13 Compatibility** - Full support for TYPO3 v13.4.0+ LTS
* **Persistent Filter State Per User** - User filter preferences are automatically saved and restored on subsequent visits
* **Bulk Stage Transitions** - Drag-and-drop functionality for moving multiple items between workflow stages simultaneously

Technical Details
-----------------

* **Framework:** TYPO3 v13.4.0+
* **PHP:** PHP 8.2.0+
* **Architecture:** Modern TYPO3 service container, dependency injection
* **Code Quality:** PSR-12 compliant, full type declarations, TYPO3 coding standards
* **Documentation:** Comprehensive documentation for administrators, editors, and developers

Installation & Setup
--------------------

* Composer-based installation via ``webvision/kanban-workspaces``
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
* Loads main app module: ``@webvision/kanban-workspaces/App.js``
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

Documentation
-------------

* **Administrator Guide** - Installation, configuration, access control, troubleshooting
* **Editor Guide** - Using the kanban board, workflow management, best practices
* **Developer Guide** - Architecture, API reference, extending the extension
* **Configuration Guide** - All configuration options, TypoScript, service configuration
* **Known Problems** - Known issues, limitations, workarounds, reporting bugs

Known Limitations
-----------------

* Module only visible in active workspaces (not in Live workspace)
* Requires modern browser with ES6+ support (IE11 not supported)
* Maximum practical depth of ~4-5 levels for optimal performance
* Desktop-optimized interface (mobile support planned)
* Respects TYPO3 core workspace limitations

Supported Versions
------------------

* TYPO3: 13.4.0 to 13.4.99 (v13 LTS)
* PHP: 8.2.0 to 8.3.99
* Browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

Future Roadmap
==============

Planned Enhancements for Future Versions
-----------------------------------------

**v1.1.0 (Upcoming)**

* Custom kanban card templates
* Enhanced performance monitoring
* Additional language translations

**v1.2.0 (Planned)**

* Mobile interface optimization
* Item relationship visualization
* Advanced filtering options
* Custom stage color configuration in UI
* Workspace analytics and reporting

**v2.0.0 (Future)**

* Major UI redesign
* Advanced workflow automation
* Integration with external systems
* Custom extension hooks
* Enhanced accessibility features

Version Management
==================

Breaking Changes Policy
-----------------------

The extension follows semantic versioning:

* **Major versions (1.0, 2.0, etc.)** - May include breaking changes
* **Minor versions (1.1, 1.2, etc.)** - Backward compatible new features
* **Patch versions (1.0.1, 1.0.2, etc.)** - Bug fixes only, fully compatible

Deprecation Notices
-------------------

None in v1.0.0. All features are stable and recommended for use.

Support Lifespan
----------------

* **v1.x** - Supported until v2.0 release
* **Bug fixes** - Provided for critical issues
* **Security** - Security updates provided as needed
* **Feature requests** - Considered for minor version updates

Migration and Upgrade Notes
============================

For Users Coming from Previous Extensions
------------------------------------------

If migrating from other workspace/kanban extensions:

1. Backup your TYPO3 database
2. Install kanban-workspaces via Composer
3. Clear all caches
4. Test in development environment first
5. Compare workspace configurations to ensure compatibility
6. Deploy to production after thorough testing

Updating from 1.0.0 to Later Versions
--------------------------------------

* Check release notes for breaking changes
* Update via Composer: ``composer update webvision/kanban-workspaces``
* Run database migrations if required: ``vendor/bin/typo3 database:updateschema``
* Clear caches: ``vendor/bin/typo3 cache:flush``
* Test functionality before deploying to production

Changelog Entry Format
======================

This changelog follows the "Keep a Changelog" format:

* **Added** - New features
* **Changed** - Changes in existing functionality
* **Deprecated** - Soon-to-be removed features
* **Removed** - Now removed features
* **Fixed** - Bug fixes
* **Security** - Security vulnerability fixes

Contributors
=============

* **WebVision GmbH** - Primary development and maintenance
* **TYPO3 Community** - Feedback and testing support

Credits and Acknowledgments
===========================

This extension was developed with modern TYPO3 v13 best practices and benefits from:

* **TYPO3 Core Team** - Workspace functionality and core APIs
* **TYPO3 Community** - Testing, feedback, and use case examples
* **Modern JavaScript Standards** - ES6+ modules and patterns

Additional Resources
====================

* **Repository** - GitHub: webvision/kanban-workspaces
* **Issue Tracker** - GitHub Issues for bug reports
* **Documentation** - This comprehensive documentation
* **TYPO3 Docs** - https://docs.typo3.org/

End of Changelog
================

For detailed release history, visit the project repository.

Last Updated: 2025-01-29
Documentation Version: 1.0.0
