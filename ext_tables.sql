#
# Table structure for table 'sys_workspaces_assignee'
# Assignee mapping records for workspace version assignments (EXT:kanban_workspaces).
#
# All columns, the primary key and the "parent" index are auto-created from the
# TCA in Configuration/TCA/sys_workspaces_assignee.php by DefaultTcaSchema. Only
# the custom lookup indexes need to be declared here.
#
CREATE TABLE sys_workspaces_assignee (
  KEY be_user (be_user),
  KEY table_record (table_name, record_uid),
  KEY workspace_stage (workspace_id, stage_id)
);

#
# Table structure for table 'tx_kanbanworkspaces_stage_checklist'
# Checklist item templates for workspace stages (EXT:kanban_workspaces).
#
# Columns, the primary key and relations are auto-created from the TCA in
# Configuration/TCA/tx_kanbanworkspaces_stage_checklist.php by DefaultTcaSchema.
# - "sorting" overrides the signed integer DefaultTcaSchema derives from
#   ctrl[sortby] with an unsigned integer.
# - "parent" pins the index to (pid); DefaultTcaSchema would otherwise create it
#   as (pid, deleted) because the table is soft-deletable.
# - "stage" stores custom stage UIDs (> 0) or default stage ids (0, -10, -20).
# - "workspace_id" is set for default-stage templates (IRRE on sys_workspace).
#
CREATE TABLE tx_kanbanworkspaces_stage_checklist (
  sorting int(11) unsigned DEFAULT '0' NOT NULL,
  stage int(11) DEFAULT '0' NOT NULL,
  workspace_id int(11) DEFAULT '0' NOT NULL,
  KEY parent (pid),
  KEY stage (stage),
  KEY workspace_stage (workspace_id, stage)
);

#
# Per-card checklist checked state (EXT:kanban_workspaces).
#
CREATE TABLE tx_kanbanworkspaces_checklist_state (
  workspace_id int(11) DEFAULT '0' NOT NULL,
  table_name varchar(64) DEFAULT '' NOT NULL,
  record_uid int(11) DEFAULT '0' NOT NULL,
  stage_id int(11) DEFAULT '0' NOT NULL,
  checklist_item_uid int(11) DEFAULT '0' NOT NULL,
  checked smallint(5) DEFAULT '0' NOT NULL,
  cruser_id int(11) DEFAULT '0' NOT NULL,
  KEY lookup (workspace_id, table_name, record_uid, stage_id, checklist_item_uid),
  KEY record (workspace_id, table_name, record_uid)
);
