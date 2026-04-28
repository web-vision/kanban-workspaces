<?php

declare(strict_types=1);

defined('TYPO3') or die();

(function () {
    $GLOBALS['TCA']['sys_workspace_stage']['columns']['checklist_items'] = [
        'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:stage_checklist_items',
        'config' => [
            'type' => 'inline',
            'foreign_table' => 'tx_kanbanworkspaces_stage_checklist',
            'foreign_field' => 'stage',
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
        ],
    ];

    $GLOBALS['TCA']['sys_workspace_stage']['types']['0']['showitem'] = str_replace(
        'title,responsible_persons,',
        'title,responsible_persons,checklist_items,',
        $GLOBALS['TCA']['sys_workspace_stage']['types']['0']['showitem']
    );
})();
