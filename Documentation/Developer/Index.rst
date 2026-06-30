..  _developer:

=========
Developer
=========

Architecture Overview
======================

The Kanban Workspaces extension follows modern TYPO3 v13 development practices, emphasizing clean architecture, dependency injection, and separation of concerns.

**Key Principles:**

* **TYPO3 v13 Compatibility** - Built using TYPO3 v13 features and APIs
* **Dependency Injection** - All services use constructor injection
* **Event Listeners** - Hooks into TYPO3 workspace events
* **Service Container** - Automatic service registration and autowiring
* **Modern PHP** - Requires PHP 8.2+ with type declarations
* **PSR-4 Autoloading** - Organized class structure following PSR-4 standard

Core Components
===============

Controller
----------

**KanbanWorkspacesController**

*Namespace:* ``WebVision\KanbanWorkspaces\Controller\KanbanWorkspacesController``

*Responsibility:* Main backend module controller handling HTTP requests and view rendering.

Key Methods:

.. php:method:: indexAction(): ResponseInterface

   Main action rendering the kanban board interface.

   Responsibilities:
   
   * Retrieves active workspace and page context
   * Fetches configured workspace stages
   * Prepares filter options (depth, language, stage)
   * Loads CSS and JavaScript assets
   * Renders ModuleTemplate with configured data
   
   **Returns:** ResponseInterface containing rendered module HTML

   **Access:** Requires workspace and page access

.. php:method:: addAssets(): void

   Loads CSS and JavaScript modules required for the kanban board.

   **Loaded Assets:**
   
   * ``Resources/Public/Css/Styles.css`` - Kanban board styles
   * ``Resources/Public/Css/Fontawesome.min.css`` - Icon fonts
   * ``@web-vision/kanban-workspaces/App.js`` - Main JavaScript application
   * ``@typo3/workspaces/renderable/send-to-stage-form.js`` - Workspace form component

.. php:method:: configureKanban(array $stageConfig): void

   Configures the JavaScript frontend with stage and filter data.

   **Parameters:**
   
   * ``$stageConfig`` - Array of stage configuration with page ID, workspace, stages, and filters

   **Example:**
   
   .. code-block:: php

      $this->configureKanban([
          'pageUid' => 123,
          'workspaceId' => 1,
          'stages' => $stageConfig,
          'selectedLanguage' => 'en',
          'selectedDepth' => 2,
          'selectedStage' => -99,
          'filters' => [
              'depth' => [...],
              'language' => [...],
              'stage' => [...],
          ],
      ]);

.. php:method:: getSystemLanguages(int $pageId, string $selectedLanguage = ''): array

   Retrieves available system languages for the given page.

   **Parameters:**
   
   * ``$pageId`` - Page UID to get languages for
   * ``$selectedLanguage`` - Currently selected language (for marking as active)

   **Returns:** Array of language configuration objects with id, label, and flag

   **Example Return:**
   
   .. code-block:: php

      [
          ['id' => 'all', 'label' => 'All', 'flag' => ''],
          ['id' => '0', 'label' => 'English', 'flag' => 'en'],
          ['id' => '1', 'label' => 'Deutsch', 'flag' => 'de'],
      ]

Domain Models and DTOs
----------------------

**EmConfiguration**

*Namespace:* ``WebVision\KanbanWorkspaces\Domain\Model\Dto\EmConfiguration``

*Responsibility:* Provides typed access to Extension Manager configuration.

Methods:

.. php:method:: getDisableDefaultStage(): bool

   Returns whether default stages should be disabled.

.. php:method:: getDefaultStageId(): int

   Returns the default stage ID for new records.

**Usage Example:**

.. code-block:: php

   $emSettings = GeneralUtility::makeInstance(EmConfiguration::class);
   
   if ($emSettings->getDisableDefaultStage()) {
       // Only show custom stages
   }
   
   $defaultStage = $emSettings->getDefaultStageId();

Event Listeners
===============

AfterDataGeneratedForWorkspaceEventListener
--------------------------------------------

*Namespace:* ``WebVision\KanbanWorkspaces\EventListener\AfterDataGeneratedForWorkspaceEventListener``

*Event:* ``TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent``

*Responsibility:* Processes workspace data after generation, applies default stage configuration.

**What it does:**

1. Listens for workspace data generation events
2. Checks if default stages should be disabled (via EmConfiguration)
3. For custom default stage ID, updates record stages accordingly
4. Persists stage changes to the database

**Code Example:**

.. code-block:: php

   #[AsEventListener(
       identifier: 'kanban-workspaces/after-data-generated-for-workspace',
   )]
   final class AfterDataGeneratedForWorkspaceEventListener
   {
       public function __invoke(AfterDataGeneratedForWorkspaceEvent $event): void
       {
           $emSettings = GeneralUtility::makeInstance(EmConfiguration::class);
           
           if (empty($emSettings->getDisableDefaultStage())) {
               return;
           }
           
           // Process event data...
       }
   }

**Key Methods:**

.. php:method:: __invoke(AfterDataGeneratedForWorkspaceEvent $event): void

   Entry point for event processing (implements Invokable interface).

Frontend JavaScript Architecture
================================

The frontend is delivered as ES6 modules under ``Resources/Public/JavaScript/``, import-mapped to
``@web-vision/kanban-workspaces/`` (see ``Configuration/JavaScriptModules.php``). What used to be a single
``Workspace.js`` file is now a central orchestrator with focused, single-responsibility collaborators.

Entry point and orchestrator
----------------------------

* ``App.js`` – entry point loaded as the module trigger. It enables horizontal drag-to-scroll
  (``core/HorizontalScroll.js``), instantiates ``WorkspaceBoard`` with the runtime options (API URLs,
  feature flags such as ``enableDragDrop`` / ``enableFilters`` / ``enableSearch``, ``mockData``), and
  registers the application-level event handlers — most importantly ``card:moved``, which POSTs the move
  to the workspace dispatch endpoint.
* ``WorkspaceBoard.js`` – the ``WorkspaceBoard`` class. It owns the shared state (cards, stages, filters,
  selection, undo/redo history, current workspace, search query) and the lifecycle wiring, and delegates
  the real work to its collaborators. Collaborators are constructed with a back-reference to the board and
  reach shared state and each other through it (e.g. ``this.board.data``, ``this.board.renderer.renderBoard()``).

Collaborators
-------------

.. list-table::
   :header-rows: 1
   :widths: 22 28 50

   * - Collaborator
     - File
     - Responsibility
   * - ``WorkspaceApi``
     - ``data/WorkspaceApi.js``
     - Thin AJAX transport over the workspace dispatch endpoint; hands raw responses to the transformer. Does not touch the DOM.
   * - ``DataTransformer``
     - ``data/DataTransformer.js``
     - Stateless conversion of raw TYPO3 workspace payloads into the card / comment / history / diff shapes consumed by the UI.
   * - ``BoardRenderer``
     - ``ui/BoardRenderer.js``
     - Generates all board markup (columns, cards, filter sidebar) and re-attaches drag-and-drop after a render.
   * - ``DragController``
     - ``ui/DragController.js``
     - Card drag-and-drop and column drop targets, drop placeholders, and starting the stage-transition workflow on drop.
   * - ``ModalController``
     - ``ui/ModalController.js``
     - Preview modal (summary / comments / history tabs) and the custom Send-to-Stage modal, including the revert / approve workflow. Holds the transient send-to-stage form state.
   * - ``FilterController``
     - ``ui/FilterController.js``
     - Search and filter interaction: keeps active filters and search query in sync, persists selections and triggers reloads / re-renders.
   * - ``CardActions``
     - ``ui/CardActions.js``
     - Per-card context-menu actions: preview, edit, open page version, assign a backend user, discard the version, and the move / revert primitives.
   * - ``EventEmitter``
     - ``core/EventEmitter.js``
     - Minimal pub/sub used for the board's custom events.
   * - ``initHorizontalScroll``
     - ``core/HorizontalScroll.js``
     - Drag-to-scroll panning of the horizontal board (ignores drags starting on a card or column).
   * - utilities
     - ``core/utils.js``
     - Stateless helpers shared across components (HTML escaping, initials, date/icon formatting, toasts, loading indicators, ``debounce``).

Events
------

``WorkspaceBoard`` exposes ``on(event, handler)`` / ``off(event, handler)`` / ``emit(event, …)`` through its
``EventEmitter``. Subscribe to observe and extend behaviour. Notable events:

* ``board:initialized``, ``board:rendered``, ``board:destroyed`` – board lifecycle.
* ``data:loaded`` – workspace records fetched and transformed.
* ``card:moved``, ``card:drop``, ``card:dragstart``, ``card:dragend``, ``card:click`` – card interactions.
* ``filter:change``, ``filter:clear``, ``search:change``, ``search:clear`` – filter / search changes.
* ``comment:added`` – a comment was added in the preview modal.

Stage Checklist Feature (Implementation)
=========================================

The Stage Checklist feature adds optional checklist items per workspace stage. When editors move a card to a stage (drag or Approve/Revert), the "Send to Stage" modal shows that stage's checklist at the top. The checklist is display-only (no checkboxes or submission).

Database and TCA
----------------

* **Table:** ``tx_kanbanworkspaces_stage_checklist`` (see ``ext_tables.sql``). Columns: ``uid``, ``pid``, ``tstamp``, ``crdate``, ``deleted``, ``sorting``, ``stage`` (FK to ``sys_workspace_stage.uid``), ``title``.
* **TCA:** ``Configuration/TCA/tx_kanbanworkspaces_stage_checklist.php`` defines the checklist table (label, sorting, delete, columns ``stage``, ``title``; record icon ``kanban-workspaces-stage-checklist``).
* **TCA override:** ``Configuration/TCA/Overrides/sys_workspace_stage.php`` adds ``checklist_items`` inline field to ``sys_workspace_stage`` (after ``responsible_persons``). Inline: sortable, ``expandSingle``, no sync/localization links.

Icons
~~~~~

* **File:** ``Configuration/Icons.php`` registers ``kanban-workspaces-stage-checklist`` with ``SvgIconProvider``, source ``EXT:kanban_workspaces/Resources/Public/Icons/checklist.svg``. Used for TCA record icons and for each checklist row in the Send to Stage modal.

Controller
~~~~~~~~~~

* In ``KanbanWorkspacesController::indexAction()``, each stage in the config is enriched with a ``checklist`` array. For each stage with ``uid >= 1``, ``getChecklistForStage($stageUid)`` is called.
* ``getChecklistForStage(int $stageUid): array`` – queries ``tx_kanbanworkspaces_stage_checklist`` for the given ``stage``, ``deleted = 0``, ordered by ``sorting``. Deduplicates by ``uid`` and by ``title``. Returns ``[ ['id' => uid, 'title' => title], ... ]``. The array is part of ``WorkspaceConfig`` (JSON) passed to the frontend.

Frontend (Template, JavaScript, CSS)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

* **Template:** Send to Stage modal (``#sendToStageModal``) body order: ``#stageInfoBanner``, then ``#stageChecklistSection`` / ``#stageChecklistList``, then recipients, additional recipients, comments.
* **JavaScript:** ``openSendToStageModal(formData, context)`` in ``ui/ModalController.js`` reads ``context.targetStage?.checklist``, deduplicates by ``id``/``title``, renders ``<ul>`` of ``<li class="stage-checklist-item">`` with ``<span class="stage-checklist-item-icon"></span>`` and title; injects icon via ``Icons.getIcon('kanban-workspaces-stage-checklist', Icons.sizes.small)`` into each icon span. When modal is opened via Approve/Revert, ``handleNextStage`` / ``handleRevertStage`` (also in ``ui/ModalController.js``) compute target stage and pass ``targetStage`` in context.
* **CSS:** ``Resources/Public/Css/Styles.css`` – ``.stage-checklist-section``, ``.stage-checklist-list`` (max-height, overflow, scrollable), ``.stage-checklist-ul``, ``.stage-checklist-item``, ``.stage-checklist-item-icon``.

Assign Feature (Implementation)
================================

The Assign feature allows editors to assign a backend user to a workspace record (card). It consists of an Ajax controller, persistence service, notification service, two event listeners, a dedicated database table, and TCA enrichment.

AssignAjaxController
--------------------

*Namespace:* ``WebVision\KanbanWorkspaces\Controller\AssignAjaxController``

*Responsibility:* Handles the Ajax request for saving an assignment (assignee, title, description) and triggers persistence and email notification.

*Route:* ``kanban_workspace_assign``, path ``/kanban-workspace/assign`` (see ``Configuration/Backend/AjaxRoutes.php``). Access is inherited from module ``web_kanbanworkspaces``.

*Key method:* ``assignAction(ServerRequestInterface $request): ResponseInterface`` – parses request body (table, record_uid, workspace_id, stage_id, be_user, title, description), calls ``AssigneeMappingService::persistAssignmentWithMeta()`` and ``AssignmentNotificationService::notifyAssignee()``, returns JSON success/error.

*Note:* The controller is instantiated by the backend dispatcher via ``GeneralUtility::makeInstance()`` (no constructor args). It resolves ``AssigneeMappingService`` and ``AssignmentNotificationService`` from the container inside the action; both services are registered as **public** in ``Configuration/Services.yaml``.

AssigneeMappingService
----------------------

*Namespace:* ``WebVision\KanbanWorkspaces\Service\AssigneeMappingService``

*Responsibility:* Persists assignment data to ``sys_workspaces_assignee`` (insert or update per record/workspace), sets ``t3ver_assignee`` on the versioned record, and cleans up assignee rows when a record is published.

*Key methods:*
  * ``persistAssignmentWithMeta(beUserId, tableName, recordUid, workspaceId, stageId, title, description)`` – upserts one row in ``sys_workspaces_assignee`` and updates the record’s ``t3ver_assignee`` column.
  * ``cleanupForPublished(table, recordId, workspaceId)`` – deletes rows in ``sys_workspaces_assignee`` for the given table/record/workspace (called by ``AssigneeCleanupAfterPublishListener``).

AssignmentNotificationService
-----------------------------

*Namespace:* ``WebVision\KanbanWorkspaces\Notification\AssignmentNotificationService``

*Responsibility:* Sends an email to the assignee when they are assigned to a record (unless the assignee is the current user or has no valid email). Uses TYPO3’s ``MailerInterface`` and ``FluidEmail`` with the extension’s templates and the core **SystemEmail** layout.

*Dependencies:* ``MailerInterface``, ``LoggerInterface``, ``StagesService``, ``PreviewUriBuilder``.

*Templates:* ``Resources/Private/Templates/Email/AssignmentNotification.html`` and ``AssignmentNotification.txt``. Fallback MAIL template/layout/partial paths (EXT:core, EXT:backend) are used when global MAIL config does not define them.

*Configuration:* Sender/format can be overridden via Page TSconfig ``tx_workspaces.emails.*``; otherwise ``MAIL.defaultMailFromAddress`` / ``defaultMailFromName`` and transport apply.

AssigneeEnrichmentListener
--------------------------

*Namespace:* ``WebVision\KanbanWorkspaces\EventListener\AssigneeEnrichmentListener``

*Event:* ``TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent``

*Identifier:* ``kanban-workspaces/assignee-enrichment`` (runs after ``kanban-workspaces/after-data-generated-for-workspace``).

*Responsibility:* Enriches each workspace item in the event data with assignee info from ``sys_workspaces_assignee`` and ``be_users``: ``assignee_uid``, ``assignee_username``, ``assignee_avatar_url`` (from FAL avatar when available). The frontend uses these to display the assignee on the card.

AssigneeCleanupAfterPublishListener
------------------------------------

*Namespace:* ``WebVision\KanbanWorkspaces\EventListener\AssigneeCleanupAfterPublishListener``

*Event:* ``TYPO3\CMS\Workspaces\Event\AfterRecordPublishedEvent``

*Identifier:* ``kanban-workspaces/assignee-cleanup-after-publish``

*Responsibility:* After a record is published, calls ``AssigneeMappingService::cleanupForPublished()`` to remove assignee rows for that table/record/workspace.

Database and TCA
----------------

*Table:* ``sys_workspaces_assignee`` (defined in ``ext_tables.sql``). Columns include ``uid``, ``pid``, ``tstamp``, ``crdate``, ``title``, ``description``, ``be_user``, ``table_name``, ``record_uid``, ``workspace_id``, ``stage_id``. One row per record/workspace (last assignee wins on update).

*TCA:* ``Configuration/TCA/Overrides/t3ver_assignee.php`` adds a read-only ``t3ver_assignee`` column (select on ``sys_workspaces_assignee``) to all tables with ``versioningWS``, so the versioned record can reference the assignee mapping row.

Services and Ajax Route
-----------------------

*Services.yaml:* ``AssigneeMappingService`` and ``AssignmentNotificationService`` are explicitly **public** so they can be resolved from the container when ``AssignAjaxController`` is created by ``makeInstance``. ``KanbanWorkspacesController`` and ``EmConfiguration`` remain public for module and config access.

*Ajax route:* ``Configuration/Backend/AjaxRoutes.php`` registers route ``kanban_workspace_assign`` with path ``/kanban-workspace/assign`` and target ``AssignAjaxController::assignAction``.

API Reference
=============

Controller Interface
--------------------

The KanbanWorkspacesController extends ``ActionController`` and provides the backend module interface:

**Injected Dependencies:**

.. code-block:: php

   public function __construct(
       protected readonly ModuleTemplateFactory $moduleTemplateFactory,
       protected readonly IconFactory $iconFactory,
       protected readonly PageRenderer $pageRenderer,
       protected readonly WorkspaceStageRepository $workspaceStageRepository,
       protected readonly WorkspaceRepository $workspaceRepository,
       protected readonly EmConfiguration $emSettings,
       protected readonly TranslationConfigurationProvider $translationConfigurationProvider,
   ) {}

**Available TYPO3 Services:**

* **ModuleTemplateFactory** - Creates module template for rendering
* **IconFactory** - Generates icons for UI elements
* **PageRenderer** - Adds CSS/JS and inline configuration
* **WorkspaceStageRepository** - Retrieves workspace stages
* **WorkspaceRepository** - Retrieves workspace records
* **TranslationConfigurationProvider** - Gets site language configuration
* **EmConfiguration** - Extension Manager settings

Configuration Files
===================

Backend Module Configuration
-----------------------------

**File:** ``Configuration/Backend/Modules.php``

Defines the backend module registration:

.. code-block:: php

   return [
       'web_kanbanworkspaces' => [
           'parent' => 'web',
           'position' => ['after' => 'web_info'],
           'inheritNavigationComponentFromMainModule' => true,
           'access' => 'user',
           'workspaces' => '*',
           'icon' => 'EXT:kanban_workspaces/Resources/Public/Icons/Extension.png',
           'path' => '/module/web/kanbanworkspaces',
           'labels' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang_mod.xlf',
           'extensionName' => 'KanbanWorkspaces',
           'controllerActions' => [
               KanbanWorkspacesController::class => [
                   'index',
               ],
           ],
       ]
   ];

**Configuration Properties:**

* **parent** - Parent module in the backend menu tree
* **position** - Position relative to other modules
* **inheritNavigationComponentFromMainModule** - Inherit parent module's navigation
* **access** - Access level required (user, admin, systemMaintainer)
* **workspaces** - Which workspaces the module is available in
* **icon** - Icon file path
* **path** - URL path for the module
* **labels** - Language file for localization
* **extensionName** - Extension identifier
* **controllerActions** - Maps controller classes to available actions

Service Configuration
---------------------

**File:** ``Configuration/Services.yaml``

.. code-block:: yaml

   services:
     _defaults:
       autowire: true
       autoconfigure: true

     WebVision\KanbanWorkspaces\:
       resource: '../Classes/'

Enables automatic service registration and dependency injection for all classes in the ``Classes/`` directory.

JavaScript Modules
------------------

**File:** ``Configuration/JavaScriptModules.php``

Defines and configures JavaScript modules needed for the module:

.. code-block:: php

   return [
       'dependencies' => [
           'core',
           'workspaces',
       ],
       'triggers' => [
           '@web-vision/kanban-workspaces/App.js',
       ],
   ];

**Available Modules:**

* ``@web-vision/kanban-workspaces/App.js`` - Main kanban board application
* ``@typo3/workspaces/renderable/send-to-stage-form.js`` - Stage transition form

Extending the Extension
=======================

Creating Custom Event Listeners
--------------------------------

To hook into workspace events:

.. code-block:: php

   <?php
   
   namespace MyVendor\MyExtension\EventListener;
   
   use TYPO3\CMS\Core\Attribute\AsEventListener;
   use TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent;
   
   #[AsEventListener(
       identifier: 'my-extension/custom-workspace-listener',
   )]
   final class CustomWorkspaceEventListener
   {
       public function __invoke(AfterDataGeneratedForWorkspaceEvent $event): void
       {
           // Your custom logic here
       }
   }

**Registration:** Automatically registered through ``Services.yaml`` with ``autoconfigure: true``

Extending the Controller
------------------------

To add custom actions to the module:

.. code-block:: php

   <?php
   
   namespace MyVendor\MyExtension\Controller;
   
   use WebVision\KanbanWorkspaces\Controller\KanbanWorkspacesController as BaseController;
   use Psr\Http\Message\ResponseInterface;
   
   class ExtendedKanbanWorkspacesController extends BaseController
   {
       public function customAction(): ResponseInterface
       {
           // Your custom action logic
       }
   }

Register in your extension's ``Configuration/Backend/Modules.php``:

.. code-block:: php

   'controllerActions' => [
       ExtendedKanbanWorkspacesController::class => [
           'index',
           'custom',
       ],
   ],

Customizing Views
-----------------

Override the default template in your extension:

1. Create ``Resources/Private/Templates/KanbanWorkspaces/Index.html``
2. Copy content from the original extension
3. Modify as needed
4. Register in your extension's module configuration

Customizing Assets
------------------

To customize styles or JavaScript:

1. Create custom CSS in ``Resources/Public/Css/Custom.css``
2. Create custom JavaScript in ``Resources/Public/JavaScript/Custom.js``
3. Load in your extension's controller or module configuration

Testing
=======

Unit Testing
------------

To test your custom extensions:

.. code-block:: php

   <?php
   
   namespace MyVendor\MyExtension\Tests\Unit\EventListener;
   
   use PHPUnit\Framework\TestCase;
   use MyVendor\MyExtension\EventListener\CustomWorkspaceEventListener;
   
   class CustomWorkspaceEventListenerTest extends TestCase
   {
       public function testEventListenerProcessesData(): void
       {
           $listener = new CustomWorkspaceEventListener();
           $event = new AfterDataGeneratedForWorkspaceEvent([]);
           
           $listener($event);
           
           $this->assertTrue(true); // Your assertions here
       }
   }

Functional Testing
------------------

Test the kanban board integration:

1. Create a test workspace with stages
2. Add test pages and content items
3. Navigate to the kanban module
4. Verify stage display and item appearance
5. Test drag-and-drop functionality

Debugging
=========

Enable Debug Output
-------------------

In ``LocalConfiguration.php``:

.. code-block:: php

   'BE' => [
       'debug' => true,
   ],

Browser Console
---------------

Open browser developer tools (F12) to see JavaScript console for:

* Module initialization errors
* Drag-and-drop logging
* Filter update notifications
* API communication logs

Backend Logging
---------------

TYPO3 logs extension errors to ``var/log/typo3_*.log``

Check logs for:

* Service initialization errors
* Database query failures
* Event listener exceptions
* Permission check failures

Performance Optimization
========================

Database Query Optimization
---------------------------

The extension uses efficient queries through TYPO3's repository pattern:

* Respects workspace context automatically
* Filters by language configuration
* Uses depth parameters for limited results
* Implements lazy loading where possible

For large workspaces:

1. Filter by depth in the UI
2. Filter by language for multi-language sites
3. Regularly publish items to keep workspace size manageable
4. Use workspace archiving features

Caching Strategy
----------------

Workspace data is typically not cached to ensure current status. For custom implementations, consider:

.. code-block:: php

   // Cache workspace configuration (stable)
   $cacheIdentifier = 'workspace_' . $workspaceId;
   
   // Don't cache item/stage data (changes frequently)
   // Always query fresh from database

Asset Optimization
------------------

The extension loads assets efficiently:

* CSS files are concatenated by TYPO3
* JavaScript modules are loaded asynchronously
* Icons use icon factory for optimization
* Images should be optimized before deployment

Code Quality
============

PHP Standards
-------------

The extension follows:

* **PSR-12** - Extended coding style guide
* **TYPO3 Coding Guidelines** - TYPO3-specific standards
* **Strict Types** - All files use ``declare(strict_types=1)``
* **Type Hints** - Full type declarations for methods and properties

JavaScript Standards
--------------------

* **ES6+ Syntax** - Modern JavaScript features
* **TYPO3 JS Module Pattern** - Uses TYPO3's module system
* **Linting** - TYPO3 ESLint configuration

Documentation Standards
-----------------------

* **PHPDoc Comments** - All classes and methods documented
* **RST Documentation** - User and developer documentation
* **Inline Comments** - Complex logic is documented

Version Compatibility
=====================

TYPO3 Versions
--------------

* **Minimum:** TYPO3 13.4.0 LTS
* **Maximum:** TYPO3 13.4.99 (latest v13 patch)

**Breaking Changes:** None planned for v13 support period

PHP Versions
------------

* **Minimum:** PHP 8.2.0
* **Maximum:** PHP 8.3.99

**Features Used:**
* Constructor property promotion (PHP 8.0+)
* Named arguments (PHP 8.0+)
* Match expressions (PHP 8.0+)
* Attributes (PHP 8.0+)

Upgrading and Migration
=======================

Backward Compatibility
----------------------

The extension maintains backward compatibility within v1.x versions. Changes between minor versions should not break existing code.

Breaking Changes
----------------

Any breaking changes in major versions (2.0+) will be documented in:

* ``CHANGELOG.md`` - Version history
* ``Documentation/ChangeLog/Index.rst`` - Detailed migration guide

Migration Guide
---------------

For upgrades from v0.x to v1.x:

1. Update via Composer
2. Run database migrations (if any)
3. Clear caches
4. Test functionality in development
5. Deploy to production

Troubleshooting Guide
=====================

Common Issues and Solutions
---------------------------

**Module not showing up**

1. Verify extension is activated
2. Check user has Web module access
3. Clear backend caches
4. Check browser console for errors

**Stages not displaying**

1. Verify workspace is active (not Live)
2. Check workspace configuration has stages
3. Verify page access permissions
4. Check EmConfiguration settings

**Drag-and-drop not working**

1. Check JavaScript console for errors
2. Verify user has stage edit permissions
3. Clear browser cache
4. Try different browser to isolate issue

**Performance issues with large workspaces**

1. Use depth filter to limit displayed items
2. Filter by language for multi-language sites
3. Consider splitting large workspaces
4. Monitor database query performance

Resources
=========

* **TYPO3 Documentation** - https://docs.typo3.org/
* **TYPO3 API Documentation** - https://typo3api.docs.typo3.org/
* **Extension Repository** - https://extensions.typo3.org/
* **Community Forum** - https://typo3.org/community/
