.. include:: /Includes.rst.txt

=======================
Assign User to Content
=======================

This document describes how the **Assign** feature works in Kanban Workspaces and how to test it.

How It Works
============

Overview
--------

The Assign feature lets you assign a **backend user** to a workspace content element (a card on the kanban board). You can add an optional **title** and **description** for the assignment. The assignment is stored in the extension’s own table and is shown on the card (including assignee avatar when available). When you assign a **different** user (not yourself), that user receives an **email notification**. When the record is **published**, assignment data for that record is cleaned up automatically.

Flow
----

1. **Assign**
   * You open the card context menu (⋯) and choose **Assign**.
   * A modal opens with:
     * **Title** (optional)
     * **Description** (optional)
     * **Assignee** (required) – select a backend user from the dropdown (populated from ``be_users``).
   * You click **OK**.
   * The extension sends the data to its own Ajax endpoint and saves one row in the table `sys_workspaces_assignee` (per record/workspace/assignee).
   * If the assignee is **not** the current user and has a valid email, an **assignment notification email** is sent (subject and body from Fluid templates).
   * The modal closes, a success message is shown, and the board refreshes.
   * After refresh, the card shows the assignee (avatar image or initial) in the card footer, using data enriched from `sys_workspaces_assignee` and `be_users`.

2. **Display**
   * When the board loads (or refreshes), workspace data is enriched with assignee info from `sys_workspaces_assignee` and `be_users` (including avatar URL from FAL when the backend user has an avatar).
   * Each card that has an assignee shows it in the footer (avatar image if available, otherwise user initial).

3. **Email notification**
   * When you assign another backend user (with a valid email), the extension sends one email per assignment using TYPO3’s mailer and Fluid email templates.
   * The email uses the **SystemEmail** layout and the extension’s templates under ``EXT:kanban_workspaces/Resources/Private/Templates/Email/`` (e.g. AssignmentNotification).
   * Sender and format can be overridden via Page TSconfig ``tx_workspaces.emails.*``; otherwise global ``MAIL`` defaults (e.g. ``defaultMailFromAddress``) apply.

4. **Publish**
   * When a record is **published** (via TYPO3 workspace publish), the extension listens to the core event `AfterRecordPublishedEvent`.
   * It then deletes all rows in `sys_workspaces_assignee` for that table, record UID, and workspace.
   * So assignments are only kept for draft/workspace content; they are not kept after publish.

Technical Summary
-----------------

* **Storage:** Table `sys_workspaces_assignee` (extension-owned). Optional TCA column `t3ver_assignee` on versioned tables points to the assignee mapping row; no core schema is changed beyond that.
* **UI:** Assign is in the card context menu (⋯ → Assign). Assign modal uses TYPO3 backend Modal with assignee dropdown; assignee is shown on the card with `.card-assignees` / `.user-avatar` (avatar image or initial).
* **Backend:** Ajax route `kanban_workspace_assign` (path ``/kanban-workspace/assign``) → `AssignAjaxController::assignAction`; service `AssigneeMappingService` for persist and cleanup; `AssignmentNotificationService` for sending the assignee email; `AssigneeCleanupAfterPublishListener` for cleanup on publish; `AssigneeEnrichmentListener` to add assignee (and assignee avatar URL) to workspace data for display.
* **Email:** `AssignmentNotificationService` uses `MailerInterface`, FluidEmail, and templates ``AssignmentNotification.html`` / ``AssignmentNotification.txt``; fallback MAIL template/layout paths ensure the SystemEmail layout is found even when global MAIL config overwrites defaults.

How to Test
===========

Prerequisites
-------------

1. **TYPO3** with **EXT:workspaces** and **EXT:kanban_workspaces** installed and the database schema applied (so `sys_workspaces_assignee` exists).
2. **Backend user** logged in, with access to the Kanban Workspaces module.
3. **Non-Live workspace** – e.g. create or switch to a workspace (not “Live”).
4. **Content in workspace** – at least one page or content element that has a version in that workspace (so it appears as a card on the board).

Apply Database Schema (if needed)
---------------------------------

If the table does not exist yet:

* **Option A:** Install Tool → **Compare database** → apply changes so that `sys_workspaces_assignee` is created from :file:`ext_tables.sql`.
* **Option B:** If you use CLI: run your project’s database compare/sync command so that the extension’s schema is applied.

Get a Backend User UID
----------------------

You need a valid backend user UID for the “Assignee” field:

* In the TYPO3 backend, go to **Admin Tools → Backend Users** (or your user list), open a user and note the **UID** (e.g. 1, 2, 3).
* Or query the database: ``SELECT uid, username FROM be_users WHERE uid > 0;``

Test 1: Assign a user to a card
-------------------------------

1. Switch to a **non-Live** workspace.
2. In the backend, go to **Web → Kanban Workspaces**.
3. Select a **page** in the page tree that has workspace content (so at least one card is visible).
4. Find a **card** on the board.
5. Open the card **context menu** (click the ⋯ “more” button on the card).
6. Click **Assign**.
7. In the modal:
   * **Title:** e.g. “Review requested”
   * **Description:** e.g. “Please check by Friday”
   * **Assignee (Backend user UID):** enter a valid backend user UID (e.g. 1).
8. Click **OK**.
9. **Expected:**
   * Modal closes.
   * A success notification (e.g. “Assignment saved”) appears.
   * The board refreshes; the card shows the assignee in the footer (e.g. avatar with initial or “U1”).
10. **Optional:** Open the same module again (or refresh the page). The same card should still show the assignee (data comes from `sys_workspaces_assignee` + enrichment).

Test 2: Change assignee / title / description
----------------------------------------------

1. On the **same card**, open the context menu again and choose **Assign**.
2. Change:
   * **Assignee** to another backend user UID, or
   * **Title** or **Description**.
3. Click **OK**.
4. **Expected:** Success message, board refresh, and the card shows the **new** assignee (and the stored title/description are updated in `sys_workspaces_assignee`).

Test 3: Validation (invalid assignee)
--------------------------------------

1. Open **Assign** on any card.
2. Leave **Assignee** empty or enter **0** or a non-existent UID.
3. Click **OK**.
4. **Expected:** Either validation prevents submit, or you see an error message and the modal may close without saving. No new/updated row in `sys_workspaces_assignee` for invalid data.

Test 4: Cleanup on publish
---------------------------

1. Note a card that has an assignee (e.g. table, UID, workspace).
2. **Publish** that record using TYPO3’s normal workspace publish (e.g. from the Workspaces list module or the action that publishes that version).
3. **Expected:**
   * The record is published as usual.
   * Rows in `sys_workspaces_assignee` for that **table**, **record_uid**, and **workspace_id** are removed by the extension’s listener.
4. **Verify:** In the database, run::

     SELECT * FROM sys_workspaces_assignee
     WHERE table_name = '<table>' AND record_uid = <uid> AND workspace_id = <workspace_id>;

   There should be **no** rows for that combination after publish.

Test 5: Assignee visible after full reload
-------------------------------------------

1. Assign a user to a card (Test 1).
2. **Reload** the Kanban Workspaces page (F5) or close and reopen **Web → Kanban Workspaces**.
3. Select the **same page** in the page tree.
4. **Expected:** The card still shows the assignee in the footer (enrichment from `sys_workspaces_assignee` + `be_users`).

Troubleshooting
===============

**“Assign URL not configured”**
  * The Ajax route for assign is not available. Clear backend cache (Admin Tools → Flush TYPO3 and PHP cache). Ensure the extension is active and that no other extension overrides or disables the route.

**Assignee not shown on card after assign**
  * Board should refresh automatically. If not, reload the page. If assignee still does not appear, check that `AssigneeEnrichmentListener` is registered for `AfterDataGeneratedForWorkspaceEvent` and that `sys_workspaces_assignee` has a row for that record/workspace/assignee.

**Assign modal does not open**
  * Check the browser console for JavaScript errors. Ensure no other script overrides the card menu or modal behavior.

**Table sys_workspaces_assignee does not exist**
  * Run database compare from the Install Tool (or your schema sync) so that the extension’s :file:`ext_tables.sql` is applied.

**Cleanup on publish does not run**
  * Ensure `AssigneeCleanupAfterPublishListener` is registered for `AfterRecordPublishedEvent`. Clear caches and try publishing again.

**Email not sent after assign**
  * Ensure the assignee is **not** the current user and has a valid **email** in the backend user record.
  * Configure ``MAIL`` in your TYPO3 config (e.g. ``defaultMailFromAddress``, ``transport``). See :doc:`../Configuration/Index` (MAIL configuration).
  * Check TYPO3 logs (e.g. ``var/log/typo3_*.log``) for transport or template errors; the extension logs when email is skipped or fails.

See Also
========

* :doc:`Index <../Editor/Index>` – general Kanban Workspaces usage
* :doc:`../Configuration/Index` – module and extension configuration (including MAIL for assignment emails)
* :doc:`../Developer/Index` – implementation details (controllers, services, listeners)
