<?php

declare(strict_types=1);

/**
 * Add t3ver_assignee column to all tables with versioningWS enabled.
 * The column stores the UID of the assignee mapping row in sys_workspaces_assignee.
 * DefaultTcaSchema.enrichSingleTableFieldsFromTcaColumns() will add the integer
 * column to the schema; DB compare will add it to the database.
 */
(function () {
    $tcaColumn = [
        'label' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang.xlf:t3ver_assignee',
        'config' => [
            'type' => 'select',
            'renderType' => 'selectSingle',
            'foreign_table' => 'sys_workspaces_assignee',
            'readOnly' => true,
            'items' => [],
        ],
    ];

    foreach ($GLOBALS['TCA'] as $tableName => $tableDefinition) {
        if (empty($tableDefinition['ctrl']['versioningWS'])) {
            continue;
        }
        $GLOBALS['TCA'][$tableName]['columns']['t3ver_assignee'] = $tcaColumn;
    }
})();
