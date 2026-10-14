.. include:: /Includes.txt

.. _editor-mentions:

===========
@ Mentions
===========

Kanban comments (Comment tab and Send-to-stage) use the TYPO3 CKEditor 5 rich-text
editor with the **core default RTE preset** (same as content elements). The
**Mention** plugin is enabled in the Kanban module only.

Typing ``@`` opens an autocomplete of workspace members **and backend user groups**
(workspace owners/members/stage responsible groups, plus groups that workspace
members belong to). Groups are shown with a member count and are reserved in the
suggestion list so they are not crowded out by users.

Selecting a suggestion inserts a mention chip. Mentioned users and all members of
mentioned groups receive an email notification (Activity comments and Send-to-stage).
During stage transitions, mentions also auto-select matching recipients and may
fill additional email lines when the user is not in the stage recipient list.

Mention storage
===============

Mentions are stored as HTML spans inside the comment body, for example:

.. code-block:: html

   <span class="mention" data-mention="@user:12">@jane.doe</span>
   <span class="mention" data-mention="@group:5">@Editors</span>

Notifications
=============

* **User mention** (``@user:{uid}``): that backend user receives an email
  (skipped if they have no valid email, or if they authored the comment).
* **Group mention** (``@group:{uid}``): **every member** of that backend user
  group is resolved and each member with a valid email is notified.

Suggestable groups are backend groups linked to the workspace (owners/members/
stage responsible) plus groups that workspace members belong to.

Watchers (preview sidebar)
==========================

The card preview **Watchers** list is derived from ``@user`` and ``@group``
mentions found in that card's comments. It is display-only (not a separate
subscription table).
