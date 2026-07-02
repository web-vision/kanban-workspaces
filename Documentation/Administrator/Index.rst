..  _administrator:

=============
Administrator
=============

Installation
============

The extension can be installed using Composer (recommended). Legacy mode is not supported.

Composer Installation
---------------------

.. code-block:: bash

   composer require web-vision/kanban-workspaces

After installation, activate the extension in the Extension Manager or verify it's enabled in your configuration.

Prerequisites
=============

Before installing Kanban Workspaces, ensure you have:

1. **TYPO3 v13.4 or higher** - The extension is designed for TYPO3 v13 LTS
2. **PHP 8.2 or higher** - Required for modern PHP features
3. **Workspaces Extension** - Must be installed and active (core TYPO3 feature)
4. **Backend Users with Workspace Access** - Users must have workspace permissions configured

Installation Steps
==================

1. **Install via Composer**

   .. code-block:: bash

      composer require web-vision/kanban-workspaces

2. **Activate the Extension**

   The extension will be automatically activated. You can verify this in the TYPO3 Extension Manager under "Installed Extensions".

3. **Clear Caches**

   .. code-block:: bash

      vendor/bin/typo3 cache:flush

4. **Verify Installation**

   Log in to the TYPO3 backend and navigate to the "Web" module. You should see a new "Kanban Workspaces" menu item.

Backend Module Access
=====================

After installation, a new backend module becomes available:

* **Location** - Web > Kanban Workspaces (appears in the left navigation under the "Web" menu)
* **Access** - Available to all backend users with workspace access
* **Permissions** - Users can only see workspaces they have access to

To access the Kanban Workspaces module:

1. Log in to the TYPO3 backend
2. Click "Web" in the left sidebar
3. Select "Kanban Workspaces" from the submenu
4. Select a page from the page tree to view its workspace items

Configuration
=============

The extension works out of the box with sensible defaults and requires no
configuration. It provides no Extension Manager settings; the kanban board
always shows the workspace's default "Editing" stage (stage 0) alongside all
custom stages.

Stage Checklist (Workspace Stages)
----------------------------------

You can add optional **checklist items** to each **custom workspace stage**. When editors move a card to that stage on the kanban board, the "Send to Stage" modal shows the checklist at the top (informational only; no checkboxes or submission).

**Where to configure:** Admin Tools > Workspaces. Edit a workspace that has custom stages (Internal Stages / Custom Stages).

**Steps:**

1. Expand a custom stage (e.g. "Review", "Publish").
2. In the stage form, find the **Checklist items** (or "Stage checklist") inline section.
3. Add, reorder, or remove entries (each has a **Title**). Save the workspace/stage.

Only **custom** workspace stages (with a database record) can have checklist items. Internal/system stages (e.g. default "Editing") have no checklist configuration.

Site Configuration
------------------

The extension automatically uses your site's configuration. No manual site configuration is required.

Static TypoScript
-----------------

A static TypoScript template is registered automatically:

* **Name** - "Kanban Workspaces Backend Module"
* **Location** - EXT:kanban_workspaces/Configuration/TypoScript
* **Purpose** - Backend module configuration

The template is optional but recommended for consistency.

Service Configuration
---------------------

Services are automatically configured through the extension's Services.yaml file:

.. code-block:: yaml

   services:
     _defaults:
       autowire: true
       autoconfigure: true

     WebVision\KanbanWorkspaces\:
       resource: '../Classes/'

Backend Module Configuration
=============================

The backend module is configured in `Configuration/Backend/Modules.php`:

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

This configuration:

* Places the module under the "Web" menu
* Positions it after "Web > Info"
* Grants access to regular backend users
* Makes it available in all workspaces
* Inherits navigation from the main web module

Testing the Installation
========================

1. **Verify Backend Module**

   Log in to the backend and navigate to Web > Kanban Workspaces. The module should load without errors.

2. **Check Workspace Access**

   The module only displays if you're in an active workspace (not live). Switch to a workspace in your user settings.

3. **Test Stage Display**

   Select a page from the page tree. The kanban board should display configured workspace stages.

4. **Check Filters**

   Verify that depth, language, and stage filters appear and function correctly.

Troubleshooting Installation
=============================

**Module doesn't appear in the Web menu**

* Ensure the extension is activated (check Extension Manager)
* Clear backend caches: Admin Tools > Maintenance > Clear Cache
* Verify you're logged in as a user with workspace access

**Stages are not displayed**

* Ensure you're in an active workspace (not Live)
* Check that stages are configured for the active workspace
* Verify workspace permissions in your user settings

**JavaScript errors in the console**

* Clear browser cache and hard refresh (Ctrl+Shift+R)
* Check that the extension assets are properly installed
* Verify vendor/autoload.php is up to date

Security Considerations
========================

Access Control
--------------

The extension respects TYPO3's built-in access control:

* Users without workspace access cannot see the module
* Users can only interact with workspaces they're assigned to
* Stage edit/delete permissions are enforced per workspace

Backend User Permissions
------------------------

Ensure backend users have appropriate permissions:

* **Web Module Access** - Required to access the module
* **Workspace Access** - Required to see workspace-specific items
* **Page Access** - Respects page access control lists (ACLs)

Performance Optimization
=========================

For large content trees, consider these optimizations:

1. **Limit Depth** - Use the depth filter to show fewer page levels at once
2. **Filter by Language** - Show one language at a time for multi-language sites
3. **Use Stage Filter** - Filter by specific stages to reduce items displayed
4. **Workspace Size** - Keep workspace size manageable by publishing items regularly

Upgrading
=========

From Earlier Versions
---------------------

If upgrading from an earlier version:

1. Update via Composer:

   .. code-block:: bash

      composer update web-vision/kanban-workspaces

2. Run database migrations (if any):

   .. code-block:: bash

      vendor/bin/typo3 extension:setup

3. Clear caches:

   .. code-block:: bash

      vendor/bin/typo3 cache:flush

4. Verify the module still works after upgrade

Uninstalling
============

To uninstall the extension:

1. Go to **Admin Tools** > **Extensions**
2. Find "kanban_workspaces" in the list
3. Click **Uninstall** (or use Composer: `composer remove web-vision/kanban-workspaces`)
4. Clear caches
5. Database tables remain (optional: manually clean up if needed)
