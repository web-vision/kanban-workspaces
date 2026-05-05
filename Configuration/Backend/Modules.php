<?php

declare(strict_types=1);

use WebVision\KanbanWorkspaces\Controller\KanbanWorkspacesController;

/**
 * Backend module configuration for TYPO3 v13
 */
return [
    'web_kanbanworkspaces' => [
        'parent' => 'web',
        'position' => ['after' => 'web_info'],
        'inheritNavigationComponentFromMainModule' => true,
        'access' => 'user', // admin, systemMaintainer
        'workspaces' => '*',
        'icon' => 'EXT:kanban_workspaces/Resources/Public/Icons/Extension.png',
        'path' => '/module/web/kanbanworkspaces',
        'labels' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang_mod.xlf',
        'extensionName' => 'KanbanWorkspaces',
        'controllerActions' => [
            KanbanWorkspacesController::class => [
                'index',
            ],
        ],
    ],
];
