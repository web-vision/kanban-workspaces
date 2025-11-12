<?php

declare(strict_types=1);

namespace Devzspace\KanbanWorkspaces\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;

final class WorkspaceApiController
{
    public function getWorkspaceData(ServerRequestInterface $request): ResponseInterface
    {
        try {
            // Sample workspace data - replace with actual data retrieval logic
            $workspaceData = [
                'columns' => [
                    ['id' => 'todo', 'title' => 'To Do', 'tasks' => []],
                    ['id' => 'in-progress', 'title' => 'In Progress', 'tasks' => []],
                    ['id' => 'done', 'title' => 'Done', 'tasks' => []]
                ],
                'tasks' => [
                    ['id' => 1, 'title' => 'Sample Task', 'description' => 'This is a sample task', 'column' => 'todo']
                ]
            ];

            return new JsonResponse(['success' => true, 'data' => $workspaceData]);
            
        } catch (\Exception $e) {
            return new JsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
