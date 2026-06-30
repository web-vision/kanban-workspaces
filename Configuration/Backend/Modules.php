<?php

declare(strict_types=1);

use TYPO3\CMS\Core\Information\Typo3Version;
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
        'icon' => ((new Typo3Version())->getMajorVersion()) === 13
            ? 'EXT:kanban_workspaces/Resources/Public/Icons/module-singletone.svg'
            : 'EXT:kanban_workspaces/Resources/Public/Icons/module-dualtone.svg',
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
