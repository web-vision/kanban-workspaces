<?php

declare(strict_types=1);

/**
 * Per-card checklist checked state. Written/read exclusively by ChecklistStateService.
 */
return [
    'ctrl' => [
        'label' => 'checklist_item_uid',
        'tstamp' => 'tstamp',
        'crdate' => 'crdate',
        'default_sortby' => 'tstamp DESC',
        'title' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:checklist_state',
        'hideTable' => true,
        'rootLevel' => -1,
        'typeicon_classes' => [
            'default' => 'kanban-workspaces-stage-checklist',
        ],
    ],
    'columns' => [
        'workspace_id' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:checklist_state.workspace_id',
            'config' => [
                'type' => 'number',
                'readOnly' => true,
            ],
        ],
        'table_name' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:checklist_state.table_name',
            'config' => [
                'type' => 'input',
                'size' => 30,
                'max' => 64,
                'eval' => 'trim',
                'readOnly' => true,
            ],
        ],
        'record_uid' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:checklist_state.record_uid',
            'config' => [
                'type' => 'number',
                'range' => ['lower' => 0],
                'readOnly' => true,
            ],
        ],
        'stage_id' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:checklist_state.stage_id',
            'config' => [
                'type' => 'number',
                'readOnly' => true,
            ],
        ],
        'checklist_item_uid' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:checklist_state.checklist_item_uid',
            'config' => [
                'type' => 'number',
                'range' => ['lower' => 0],
                'readOnly' => true,
            ],
        ],
        'checked' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:checklist_state.checked',
            'config' => [
                'type' => 'check',
                'readOnly' => true,
                'default' => 0,
            ],
        ],
        'cruser_id' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:checklist_state.cruser_id',
            'config' => [
                'type' => 'number',
                'readOnly' => true,
            ],
        ],
    ],
    'types' => [
        '0' => [
            'showitem' => 'workspace_id, table_name, record_uid, stage_id, checklist_item_uid, checked, cruser_id',
        ],
    ],
];
