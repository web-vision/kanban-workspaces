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
    'kanban_workspace_mention_suggest' => [
        'path' => '/kanban-workspace/mention-suggest',
        'target' => \WebVision\KanbanWorkspaces\Controller\MentionSuggestAjaxController::class . '::suggestAction',
        'inheritAccessFromModule' => 'web_kanbanworkspaces',
    ],
    'kanban_workspace_mention_notify' => [
        'path' => '/kanban-workspace/mention-notify',
        'target' => \WebVision\KanbanWorkspaces\Controller\MentionNotifyAjaxController::class . '::notifyAction',
        'inheritAccessFromModule' => 'web_kanbanworkspaces',
    ],
];
