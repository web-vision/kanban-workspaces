..  _configuration:

=============
Configuration
=============

Overview
========

The Kanban Workspaces extension is a **backend-only** module for TYPO3 that provides a kanban board interface
for managing workspace stages. It is designed to work with minimal configuration. Most settings are handled
automatically through TYPO3's core workspace functionality. However, administrators can customize behavior
through Extension Manager settings.

Extension Manager Configuration
================================

The extension does not provide any Extension Manager settings. All behavior is
derived automatically from TYPO3's core workspace functionality; the kanban
board always displays the workspace's default "Editing" stage (stage 0) together
with all custom stages.

Backend Module Configuration Details
=======================================

The backend module is registered and configured automatically. No additional TypoScript or template configuration is required for this backend-only extension.

Backend Module Configuration
=============================

Module Registration
-------------------

The backend module is configured in ``Configuration/Backend/Modules.php``:

.. code-block:: php

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

Configuration Explained
~~~~~~~~~~~~~~~~~~~~~~~~

* **parent: 'web'** - Module appears under the Web menu
* **position** - Positioned after the Web > Info module
* **inheritNavigationComponentFromMainModule: true** - Uses main web module's navigation
* **access: 'user'** - Available to regular backend users (not just admins)
* **workspaces: '*'** - Available in all workspaces
* **icon** - Icon displayed in the module menu
* **path** - URL path for accessing the module
* **labels** - Language file for localization
* **extensionName** - Extension key for identifying the module
* **controllerActions** - Maps controllers to available actions

Customizing Module Position
----------------------------

To change where the module appears in the Web menu, modify the position configuration:

.. code-block:: php

   // Position before Web > Info
   'position' => ['before' => 'web_info'],

   // Position at the end of Web menu
   'position' => ['bottom'],

   // Position at the top of Web menu
   'position' => ['top'],

Service Configuration
=====================

Dependency Injection
--------------------

The extension uses TYPO3's service container for dependency injection. Services are configured in ``Configuration/Services.yaml``:

.. code-block:: yaml

   services:
     _defaults:
       autowire: true
       autoconfigure: true
       public: false

     WebVision\KanbanWorkspaces\:
       resource: '../Classes/*'
       exclude: '../Classes/Domain/Model/*'

     WebVision\KanbanWorkspaces\Controller\KanbanWorkspacesController:
       public: true
       tags:
         - name: 'backend.controller'
           identifier: 'KanbanWorkspaces'

     WebVision\KanbanWorkspaces\Configuration\EmConfiguration:
       public: true

     WebVision\KanbanWorkspaces\Service\AssigneeMappingService:
       public: true
     WebVision\KanbanWorkspaces\Notification\AssignmentNotificationService:
       public: true

This configuration automatically registers classes in ``Classes/`` and enables autowiring. The listed services are explicitly **public** so they can be resolved when the Assign Ajax controller is instantiated by the backend dispatcher.

Assignment Feature (Ajax Route and MAIL)
========================================

Ajax Route for Assign
---------------------

The Assign feature uses a backend Ajax route so the kanban board can save assignments without leaving the module.

**File:** ``Configuration/Backend/AjaxRoutes.php``

.. code-block:: php

   return [
       'kanban_workspace_assign' => [
           'path' => '/kanban-workspace/assign',
           'target' => \WebVision\KanbanWorkspaces\Controller\AssignAjaxController::class . '::assignAction',
           'inheritAccessFromModule' => 'web_kanbanworkspaces',
       ],
   ];

* **path** – URL path for the Ajax endpoint.
* **target** – Controller class and action handling the request.
* **inheritAccessFromModule** – Access is inherited from the Kanban Workspaces module (``web_kanbanworkspaces``).

No additional configuration is required; the route is registered when the extension is active. Clear backend cache if the route does not appear.

MAIL Configuration for Assignment Emails
-----------------------------------------

When you assign a **different** backend user (not yourself) to a card, the extension can send an assignment notification email. TYPO3’s global **MAIL** configuration is used.

**Recommended in your project config (e.g. ``config/system/settings.php``):**

.. code-block:: php

   'MAIL' => [
       'defaultMailFromAddress' => 'noreply@your-domain.com',
       'defaultMailFromName' => 'TYPO3 Kanban Workspaces',
       'transport' => 'sendmail',
       'transport_sendmail_command' => '/usr/local/bin/mailpit sendmail -t --smtp-addr 127.0.0.1:1025',
       // ... other transport options
   ],

* **defaultMailFromAddress** – Sender address when no page-specific sender is set. Required for emails to be accepted by many mail servers.
* **defaultMailFromName** – Sender name shown in the email client.
* **transport** / **transport_sendmail_command** – How mail is sent (e.g. sendmail, SMTP, or a local tool like Mailpit for development).

**Optional – Page TSconfig (per-page sender/format):**

You can override sender and format per page using the workspaces email config:

.. code-block:: typoscript

   tx_workspaces.emails {
       senderEmail = no-reply@example.com
       senderName = My Site
       format = both
   }

The extension uses the same pattern as EXT:workspaces for email (FluidEmail, SystemEmail layout). Template/layout paths fall back to TYPO3 core/backend defaults when the global MAIL config does not define ``templateRootPaths`` / ``layoutRootPaths``.

**Troubleshooting:** If assignment emails are not sent, ensure the assignee has a valid email in the backend user record, check ``MAIL.transport`` and ``defaultMailFromAddress``, and review TYPO3 logs (e.g. ``var/log/typo3_*.log``) for transport or template errors.

JavaScript Module Configuration
================================

Backend JavaScript Modules
---------------------------

The extension loads backend JavaScript modules for the kanban board interface:

.. code-block:: php

   // Main kanban board application
   $this->pageRenderer->loadJavaScriptModule('@web-vision/kanban-workspaces/App.js');

   // TYPO3 workspaces send-to-stage form component
   $this->pageRenderer->loadJavaScriptModule('@typo3/workspaces/renderable/send-to-stage-form.js');

**Configuration Location:** ``Configuration/JavaScriptModules.php``

These modules are loaded exclusively in the backend module interface. No frontend JavaScript is loaded by this extension.

Environment-Specific Configuration
===================================

Development Environment
------------------------

For development, you may want to enable additional backend debugging:

.. code-block:: php

   // In your project's configuration
   $GLOBALS['TYPO3_CONF_VARS']['BE']['debug'] = true;

Production Environment
----------------------

For production, ensure optimal performance by using TYPO3's standard caching configuration. The extension respects the default caching settings configured in your TYPO3 instance.

Multi-Site Configuration
=========================

Working with Multiple Sites
----------------------------

If your TYPO3 instance has multiple sites, the Kanban Workspaces module will work independently for each site:

1. Each site can have its own workspace configuration
2. Stages are workspace-specific, not site-specific
3. Users see workspaces based on their access permissions
4. The module respects site-specific language configurations

No site-specific configuration is needed—the extension automatically uses the active site's settings.

Workspace Configuration
=======================

Workspace Stages
----------------

Workspace stages are configured in the TYPO3 workspace settings, not in this extension. To configure stages:

1. Go to **Admin Tools** > **Workspaces**
2. Select a workspace to edit
3. Configure available stages for that workspace
4. Save the workspace configuration

The Kanban Workspaces extension will automatically display the configured stages on its board.

Custom Stages
~~~~~~~~~~~~~

To create custom stages:

1. In Workspace configuration, add new stages with custom titles
2. Set appropriate permissions for each stage
3. The kanban board will display all configured stages
4. Users can move items between stages based on their permissions

Accessing Content at Different Stages
--------------------------------------

The kanban board shows all content items at different stages in the workspace:

* **Stage 0 (Editing)** - Default editing stage
* **Custom Stages** - Any custom stages created for your workflow
* **Published** - Items ready for publication

Each stage can have different permissions for editing, deletion, and stage transitions.

Event Listener Configuration
=============================

AfterDataGeneratedForWorkspaceEvent
-----------------------------------

The extension includes an event listener for workspace data generation. It is
registered via a PHP attribute (no manual ``Services.yaml`` entry required):

.. code-block:: php

   #[AsEventListener(
       identifier: 'kanban-workspaces/assignee-enrichment',
   )]
   final class AssigneeEnrichmentListener

**Purpose:** Processes workspace data when it is generated (for example, enriching records with assignment information).

**Configuration:** No manual configuration needed—automatically registered by TYPO3's service container.

Performance Configuration
==========================

Caching
-------

The extension respects TYPO3's caching strategy. Workspace data is typically not cached (to always show current status), but you can configure caching if needed:

.. code-block:: php

   $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['kanban_workspaces'] = [
       'frontend' => \TYPO3\CMS\Core\Cache\Frontend\VariableFrontend::class,
       'backend' => \TYPO3\CMS\Core\Cache\Backend\Apcu::class,
   ];

Database Queries
----------------

The extension uses efficient database queries through TYPO3's repository pattern. For large workspaces:

1. Use depth filters to limit query results
2. Filter by language to reduce items
3. Regularly publish items to keep workspace size manageable

Backend Assets Configuration
=============================

Backend Module Assets
---------------------

Assets are loaded automatically in the backend module controller:

.. code-block:: php

   // Load CSS
   $this->pageRenderer->addCssFile('EXT:kanban_workspaces/Resources/Public/Css/Styles.css');
   $this->pageRenderer->addCssFile('EXT:kanban_workspaces/Resources/Public/Css/Fontawesome.min.css');

   // Load JavaScript modules
   $this->pageRenderer->loadJavaScriptModule('@web-vision/kanban-workspaces/App.js');

**Location:** ``Resources/Public/Css/`` and ``Resources/Public/JavaScript/``

These are backend-only assets used exclusively in the kanban board backend module. No frontend assets are loaded or used by this extension.

Language and Localization
==========================

Localization Files
------------------

Language labels are stored in:

.. code-block:: plaintext

   Resources/Private/Language/locallang_mod.xlf

These contain labels for:

* Module title
* Button labels
* Filter labels
* Error messages
* Stage names

Supported Languages
~~~~~~~~~~~~~~~~~~~

By default, the extension supports:

* English (default)
* German (Deutsch)
* Additional languages can be added through extension translation contributions

Adding Custom Translations
~~~~~~~~~~~~~~~~~~~~~~~~~~~

To add translations for your language:

1. Create a new language file in ``Resources/Private/Language/``
2. Name it ``locallang_mod.[language code].xlf``
3. Add translated labels for all keys
4. Restart TYPO3 cache

Troubleshooting Configuration
==============================

Settings Not Taking Effect
---------------------------

If configuration changes don't appear:

1. Clear TYPO3 caches: **Admin Tools** > **Maintenance** > **Clear Cache**
2. Clear browser cache: Ctrl+Shift+Del
3. Verify settings were actually saved in Extension Manager
4. Restart your web server if running locally

Module Position Wrong
---------------------

If the module appears in the wrong location:

1. Check the ``position`` configuration in ``Configuration/Backend/Modules.php``
2. Verify the referenced module (e.g., 'web_info') exists
3. Clear all caches and reload the backend
4. Check for module position conflicts with other extensions
