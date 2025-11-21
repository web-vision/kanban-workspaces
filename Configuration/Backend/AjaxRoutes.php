<?php

use Devzspace\KanbanWorkspaces\Controller\WorkspaceApiController;

return [
    'kanbanworkspaces_workspace_data' => [
        'path' => '/kanbanworkspaces/workspace-data',
        'target' => WorkspaceApiController::class . '::getWorkspaceData',
        'inheritAccessFromModule' => 'web_kanbanworkspaces',
    ],
];
