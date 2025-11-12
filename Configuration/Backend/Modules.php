<?php

declare(strict_types=1);

use Devzspace\KanbanWorkspaces\Controller\KanbanWorkspacesController;

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
                'index'
            ],
        ]
    ],
    'web_kanbanworkspaces_prototype' => [
        'parent' => 'web',
        'position' => ['after' => 'web_kanbanworkspaces'],
        'inheritNavigationComponentFromMainModule' => true,
        'access' => 'user',
        'workspaces' => '*',
        'icon' => 'EXT:kanban_workspaces/Resources/Public/Icons/Extension.png',
        'path' => '/module/web/kanbanworkspaces_prototype',
        'labels' => 'LLL:EXT:kanban_workspaces/Resources/Private/Language/locallang_mod_prototype.xlf',
        'extensionName' => 'KanbanWorkspaces',
        'controllerActions' => [
            KanbanWorkspacesController::class => [
                'prototype'
            ],
        ]
    ],
];