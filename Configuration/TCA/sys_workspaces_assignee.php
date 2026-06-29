<?php

declare(strict_types=1);

/**
 * TCA for the assignee mapping table of EXT:kanban_workspaces.
 *
 * The table is filled and read exclusively by AssigneeMappingService and is not
 * meant to be edited in the backend (hidden, readOnly). A TCA definition is
 * required nevertheless: t3ver_assignee on all workspace-aware tables points to
 * this table via a select relation, and without a TCA definition the FormEngine
 * bails out with "table is not defined in TCA" (#1439569743).
 *
 * The matching database columns and the "parent" index are auto-created by
 * DefaultTcaSchema; ext_tables.sql therefore only needs to carry the custom
 * lookup indexes.
 */
return [
    'ctrl' => [
        'label' => 'title',
        'tstamp' => 'tstamp',
        'crdate' => 'crdate',
        'default_sortby' => 'tstamp DESC',
        'title' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:sys_workspaces_assignee',
        'hideTable' => true,
        'rootLevel' => -1,
        'typeicon_classes' => [
            'default' => 'status-user-backend',
        ],
    ],
    'columns' => [
        'title' => [
            'label' => 'LLL:EXT:core/Resources/Private/Language/locallang_general.xlf:LGL.title',
            'config' => [
                'type' => 'input',
                'size' => 50,
                'max' => 255,
                'eval' => 'trim',
                'readOnly' => true,
            ],
        ],
        'description' => [
            'label' => 'LLL:EXT:core/Resources/Private/Language/locallang_general.xlf:LGL.description',
            'config' => [
                'type' => 'text',
                'readOnly' => true,
            ],
        ],
        'be_user' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:sys_workspaces_assignee.be_user',
            'config' => [
                'type' => 'select',
                'renderType' => 'selectSingle',
                'foreign_table' => 'be_users',
                'readOnly' => true,
            ],
        ],
        'table_name' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:sys_workspaces_assignee.table_name',
            'config' => [
                'type' => 'input',
                'size' => 30,
                'max' => 64,
                'eval' => 'trim',
                'readOnly' => true,
            ],
        ],
        'record_uid' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:sys_workspaces_assignee.record_uid',
            'config' => [
                'type' => 'number',
                'range' => ['lower' => 0],
                'readOnly' => true,
            ],
        ],
        'workspace_id' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:sys_workspaces_assignee.workspace_id',
            'config' => [
                'type' => 'select',
                'renderType' => 'selectSingle',
                'foreign_table' => 'sys_workspace',
                'readOnly' => true,
            ],
        ],
        'stage_id' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:sys_workspaces_assignee.stage_id',
            'config' => [
                'type' => 'number',
                'readOnly' => true,
            ],
        ],
    ],
    'types' => [
        '0' => [
            'showitem' => 'title, description, be_user, table_name, record_uid, workspace_id, stage_id',
        ],
    ],
];
