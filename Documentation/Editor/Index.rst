.. include:: /Includes.rst.txt

======
Editor
======

Working with Kanban Workspaces
===============================

As an editor, the Kanban Workspaces module provides a visual, intuitive way to manage content through your publication workflow using a kanban board interface.

Accessing the Kanban Board
===========================

1. Log in to the TYPO3 backend
2. Click **Web** in the left sidebar
3. Select **Kanban Workspaces** from the submenu
4. Select a page from the page tree on the left to load its workspace items

The kanban board will display all content items in the selected page and its child pages, organized by workflow stage.

Understanding the Kanban Board
==============================

The kanban board displays your workflow stages as columns:

**Columns** - Each column represents a workflow stage (e.g., "Draft", "In Review", "Approved", "Published")

**Cards** - Each card represents a content item (page or content element) currently in that stage

**Visual Organization** - Items are grouped by stage, making it easy to see where everything is in the workflow

**Color Coding** - Different stages may have different colors to help distinguish them visually

Working with Items on the Board
================================

Moving Items Between Stages
----------------------------

To move a content item to a different stage:

1. **Click and Hold** the card you want to move
2. **Drag** the card to another column (stage)
3. **Release** the mouse button to drop the item in the new stage

The item will automatically transition to the new stage, and the change will be reflected in TYPO3's workspace system.

When you drag a card to another column (or use **Approve** or **Revert** on a card), the **Send to Stage** modal opens. If the target stage has checklist items configured by an administrator, a **Checklist** section appears at the top of the modal (below the blue info banner). Each item is shown as a list row with a checklist icon and the item title. The list is **informational only** (no checkboxes, no submission of state). Complete recipients/comments as needed and confirm to perform the stage transition.

Viewing Item Details
--------------------

To see more information about an item:

1. **Click** on a card to select it
2. The item's details will be displayed
3. You can view the item's title, current stage, and other metadata
4. Some implementations may allow inline editing of item properties

Editing Items
-------------

To edit a content item's actual content:

1. **Click** on a card to view item details
2. Look for an **Edit** button or link
3. Click to open the item in the record editor
4. Make your changes in the editor interface
5. Save your changes

The changes will be applied in your current workspace, not the live website.

Using Filters
=============

The kanban board provides several filters to help you focus on specific items:

Depth Filter
------------

Controls how many page tree levels are shown:

* **This Page** - Only items directly on the selected page (depth 0)
* **1 Level** - Selected page plus first level of child pages (depth 1)
* **2 Levels** - Selected page plus two levels of children (depth 2)
* **3 Levels** - Selected page plus three levels of children (depth 3)
* **4 Levels** - Selected page plus four levels of children (depth 4)
* **Infinite** - All pages below the selected page, regardless of depth

Use the depth filter to focus on a specific section or show more items at once.

Language Filter
---------------

For multi-language websites, filter by language:

* **All** - Show items from all languages
* **English** - Show only English language items
* **Deutsch (German)** - Show only German language items
* **[Other languages]** - Show items from specific languages configured on your site

This is helpful when managing content in multiple languages separately.

Stage Filter
------------

Show items from specific workflow stages only:

* **All Stages** - Show items in all stages
* **Draft** - Show only items in draft stage
* **In Review** - Show only items awaiting review
* **[Custom Stages]** - Show items in other custom stages defined for your workflow

Use the stage filter to focus on items that need your attention in specific stages.

Best Practices
==============

Content Organization
--------------------

**Use Clear Page Titles**
  Page titles appear on kanban cards, so clear, descriptive titles help everyone understand what content each card represents.

**Organize Your Page Tree Logically**
  The depth filter shows multiple page tree levels, so a well-organized hierarchy makes the kanban board easier to use.

**Set Appropriate Initial Stage**
  When creating new content, verify it starts in the correct initial stage for your workflow.

Workflow Management
-------------------

**Move Items in Sequence**
  Follow your workflow stages in order. For example: Draft → Review → Approved → Published.

**Use Consistent Staging**
  Ensure all editors follow the same workflow stages to maintain consistency.

**Complete Stages Promptly**
  Don't leave items stuck in intermediate stages. Move them along the workflow as soon as they're ready.

Communication
--------------

**Check Before Publishing**
  Review item details before moving to final stages to ensure content quality.

**Document Your Process**
  If your workflow includes stages like "In Review", ensure reviewers know to check the kanban board.

**Use Comments and Stages**
  Some workflow implementations may include comment or note stages—use these for team communication.

Performance Tips
================

**Use Depth Filter for Large Trees**
  If you have many pages, use the depth filter to show only 1-2 levels at a time for better performance.

**Filter by Single Language**
  On multi-language sites, showing one language at a time reduces the number of items displayed.

**Focus on Specific Stages**
  Use the stage filter to show only items that need your attention.

**Avoid Infinite Depth**
  Don't use "Infinite" depth for large page trees—it can be slow to load and hard to navigate.

Keyboard Shortcuts
==================

Depending on your configuration, these shortcuts may be available:

* **Tab** - Navigate between cards on the kanban board
* **Enter** - Open selected card for editing
* **Escape** - Deselect current card
* **Drag** - Click and drag cards to move them between stages

Common Tasks
============

Publishing Content
-------------------

Typical publishing workflow:

1. Select the page from the page tree
2. Verify the item is in the "Ready to Publish" or "Approved" stage
3. Drag the item to the "Published" stage
4. Confirm the transition in any prompts that appear
5. The content is now marked for publication

Reviewing Content
------------------

For content review workflow:

1. Select a page with items in "In Review" stage
2. Check the review stage column
3. Click on items that need review
4. Edit if needed, or move to "Approved" if content is ready
5. Reject items back to "Draft" if changes are needed

Managing Translations
---------------------

For multi-language sites:

1. Select the page to manage translations for
2. Use the language filter to show items from one language
3. Manage that language's items through the workflow
4. Switch to another language in the filter
5. Repeat the process for each language

Troubleshooting
===============

**Items don't move when I drag them**

* Ensure you have permission to edit items in the workspace
* Check that you're not in the "Live" workspace (you must be in an active workspace)
* Try refreshing the page (F5) and dragging again

**I can't see the kanban board**

* Verify you're in an active workspace (not Live)
* Select a page from the page tree on the left
* Clear your browser cache

**Filters don't work**

* Verify the correct page is selected
* Try refreshing the kanban board
* Check that content items exist in the selected page tree depth

**Stage transitions fail**

* Verify you have permission to edit items in the workspace
* Check that the target stage allows item transition
* Verify your TYPO3 user has sufficient workspace permissions

Assigning a User to a Card
==========================

You can assign a backend user to a content element (card) and optionally add a title and description. The assignee is shown on the card (with avatar when available). If you assign a **different** user (not yourself), that user receives an **email notification**. Assignments are cleaned up when the record is published.

**How to assign:** Open the card context menu (⋯) → **Assign** → fill in Title (optional), Description (optional), Assignee (required; select from dropdown) → **OK**.

For a full description of the flow, email notification, and how to test it, see :doc:`AssignUser`.

Getting Help
============

If you encounter issues:

1. **Check with your Administrator** - May need permission or configuration adjustments
2. **Clear Browser Cache** - Sometimes browser cache causes display issues (Ctrl+Shift+Del)
3. **Review Your Permissions** - Verify your backend user has workspace and page access

Additional Resources
====================

* **TYPO3 Backend User Manual** - Learn more about the TYPO3 backend
* **Workspace Documentation** - TYPO3's official workspace documentation
* **Your Organization's Workflow Guide** - Ask your administrator for your organization's specific workflow guidelines
