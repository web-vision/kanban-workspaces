#
# Table structure for table 'sys_workspaces_assignee'
# Assignee records for workspace version assignments (EXT:kanban_workspaces)
#
CREATE TABLE sys_workspaces_assignee (
  uid int(11) unsigned NOT NULL auto_increment,
  pid int(11) unsigned DEFAULT '0' NOT NULL,
  tstamp int(11) unsigned DEFAULT '0' NOT NULL,
  crdate int(11) unsigned DEFAULT '0' NOT NULL,
  title varchar(255) DEFAULT '' NOT NULL,
  description text,
  be_user int(11) unsigned DEFAULT '0' NOT NULL,
  table_name varchar(64) DEFAULT '' NOT NULL,
  record_uid int(11) unsigned DEFAULT '0' NOT NULL,
  workspace_id int(11) unsigned DEFAULT '0' NOT NULL,
  stage_id int(11) DEFAULT '0' NOT NULL,
  PRIMARY KEY (uid),
  KEY parent (pid),
  KEY be_user (be_user),
  KEY table_record (table_name, record_uid),
  KEY workspace_stage (workspace_id, stage_id)
);

#
# Table structure for table 'tx_kanbanworkspaces_stage_checklist'
# Checklist items for workspace stages (EXT:kanban_workspaces)
#
CREATE TABLE tx_kanbanworkspaces_stage_checklist (
  uid int(11) unsigned NOT NULL auto_increment,
  pid int(11) unsigned DEFAULT '0' NOT NULL,
  tstamp int(11) unsigned DEFAULT '0' NOT NULL,
  crdate int(11) unsigned DEFAULT '0' NOT NULL,
  deleted smallint(1) unsigned DEFAULT '0' NOT NULL,
  sorting int(11) unsigned DEFAULT '0' NOT NULL,
  stage int(11) unsigned DEFAULT '0' NOT NULL,
  title varchar(255) DEFAULT '' NOT NULL,
  PRIMARY KEY (uid),
  KEY parent (pid),
  KEY stage (stage)
);
