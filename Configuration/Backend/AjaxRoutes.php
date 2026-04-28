<?php

declare(strict_types=1);

/**
 * Ajax routes for EXT:kanban_workspaces
 */
return [
    'kanban_workspace_assign' => [
        'path' => '/kanban-workspace/assign',
        'target' => \WebVision\KanbanWorkspaces\Controller\AssignAjaxController::class . '::assignAction',
        'inheritAccessFromModule' => 'web_kanbanworkspaces',
    ],
];
