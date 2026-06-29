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
# Checklist items for workspace stages (EXT:kanban_workspaces).
#
# Columns, the primary key and the "stage" relation are auto-created from the TCA
# in Configuration/TCA/tx_kanbanworkspaces_stage_checklist.php by DefaultTcaSchema.
# Two entries are kept on purpose:
#  - "sorting" overrides the signed integer DefaultTcaSchema derives from
#    ctrl[sortby] with an unsigned integer.
#  - "parent" pins the index to (pid); DefaultTcaSchema would otherwise create it
#    as (pid, deleted) because the table is soft-deletable.
#
CREATE TABLE tx_kanbanworkspaces_stage_checklist (
  sorting int(11) unsigned DEFAULT '0' NOT NULL,
  KEY parent (pid),
  KEY stage (stage)
);
