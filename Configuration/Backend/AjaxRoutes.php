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
    'kanban_workspace_checklist_get' => [
        'path' => '/kanban-workspace/checklist/get',
        'target' => \WebVision\KanbanWorkspaces\Controller\ChecklistAjaxController::class . '::getAction',
        'inheritAccessFromModule' => 'web_kanbanworkspaces',
    ],
    'kanban_workspace_checklist_save' => [
        'path' => '/kanban-workspace/checklist/save',
        'target' => \WebVision\KanbanWorkspaces\Controller\ChecklistAjaxController::class . '::saveAction',
        'inheritAccessFromModule' => 'web_kanbanworkspaces',
    ],
    'kanban_workspace_checklist_toggle' => [
        'path' => '/kanban-workspace/checklist/toggle',
        'target' => \WebVision\KanbanWorkspaces\Controller\ChecklistAjaxController::class . '::toggleAction',
        'inheritAccessFromModule' => 'web_kanbanworkspaces',
    ],
];
