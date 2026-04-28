<?php

declare(strict_types=1);

return [
    'ctrl' => [
        'label' => 'title',
        'tstamp' => 'tstamp',
        'crdate' => 'crdate',
        'sortby' => 'sorting',
        'title' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:stage_checklist',
        'hideTable' => true,
        'delete' => 'deleted',
        'rootLevel' => -1,
        'typeicon_classes' => [
            'default' => 'kanban-workspaces-stage-checklist',
        ],
    ],
    'columns' => [
        'stage' => [
            'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:stage_checklist.stage',
            'config' => [
                'type' => 'select',
                'renderType' => 'selectSingle',
                'foreign_table' => 'sys_workspace_stage',
                'readOnly' => true,
            ],
        ],
        'title' => [
            'label' => 'LLL:EXT:core/Resources/Private/Language/locallang_general.xlf:LGL.title',
            'config' => [
                'type' => 'input',
                'size' => 50,
                'max' => 255,
                'required' => true,
                'eval' => 'trim',
            ],
        ],
    ],
    'types' => [
        '0' => [
            'showitem' => 'title',
        ],
    ],
];
