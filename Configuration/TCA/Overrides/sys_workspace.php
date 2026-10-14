<?php

declare(strict_types=1);

defined('TYPO3') or die();

(function () {
    $checklistInlineBase = [
        'type' => 'inline',
        'foreign_table' => 'tx_kanbanworkspaces_stage_checklist',
        'foreign_field' => 'workspace_id',
        'appearance' => [
            'useSortable' => true,
            'showSynchronizationLink' => false,
            'showAllLocalizationLink' => false,
            'showPossibleLocalizationRecords' => false,
            'expandSingle' => true,
            'enabledControls' => [
                'info' => false,
            ],
        ],
    ];

    $registerChecklistField = static function (string $column, string $labelKey, string $stage) use ($checklistInlineBase): void {
        $prefix = 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:';
        $GLOBALS['TCA']['sys_workspace']['columns'][$column] = [
            'label' => $prefix . $labelKey,
            'description' => $prefix . $labelKey . '.description',
            'config' => array_merge($checklistInlineBase, [
                'foreign_match_fields' => [
                    'stage' => $stage,
                ],
            ]),
        ];
    };

    $registerChecklistField('checklist_items_edit', 'stage_checklist_items_edit', '0');
    $registerChecklistField('checklist_items_publish', 'stage_checklist_items_publish', '-10');
    $registerChecklistField('checklist_items_execute', 'stage_checklist_items_execute', '-20');

    $GLOBALS['TCA']['sys_workspace']['types']['0']['showitem'] = str_replace(
        '--div--;workspaces.db:tabs.internal_stages,',
        '--div--;workspaces.db:tabs.internal_stages,'
        . 'checklist_items_edit,checklist_items_publish,checklist_items_execute,',
        $GLOBALS['TCA']['sys_workspace']['types']['0']['showitem']
    );
})();
