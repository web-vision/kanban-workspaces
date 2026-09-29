<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Http\JsonResponse;
use WebVision\KanbanWorkspaces\Service\ChecklistStateService;
use WebVision\KanbanWorkspaces\Service\ChecklistTemplateService;

#[AsController]
final class ChecklistAjaxController
{
    public function __construct(
        private readonly ChecklistStateService $checklistStateService,
        private readonly ChecklistTemplateService $checklistTemplateService,
    ) {
    }

    public function getAction(ServerRequestInterface $request): ResponseInterface
    {
        $parsed = $this->parseRequest($request);
        if ($parsed instanceof JsonResponse) {
            return $parsed;
        }
        [$data, $table, $recordUid, $workspaceId, $stageId] = $parsed;

        $items = $this->checklistStateService->getItemsWithState($workspaceId, $table, $recordUid, $stageId);
        $allStages = [];
        if (!empty($data['include_all_stages'])) {
            $stageIds = is_array($data['stage_ids'] ?? null) ? $data['stage_ids'] : [];
            foreach ($stageIds as $sid) {
                $sid = (int)$sid;
                $stageItems = $this->checklistStateService->getItemsWithState($workspaceId, $table, $recordUid, $sid);
                if ($stageItems !== []) {
                    $allStages[] = [
                        'stage_id' => $sid,
                        'items' => $stageItems,
                    ];
                }
            }
        }

        return new JsonResponse([
            'success' => true,
            'items' => $items,
            'stages' => $allStages,
            'templates' => $this->checklistTemplateService->getChecklistForStage($stageId, $workspaceId),
        ]);
    }

    public function saveAction(ServerRequestInterface $request): ResponseInterface
    {
        $parsed = $this->parseRequest($request);
        if ($parsed instanceof JsonResponse) {
            return $parsed;
        }
        [$data, $table, $recordUid, $workspaceId, $stageId] = $parsed;

        /** @var list<array{id?: int, uid?: int, checked?: bool|int}> $items */
        $items = is_array($data['items'] ?? null) ? array_values($data['items']) : [];

        $this->checklistStateService->saveStateSnapshot(
            $workspaceId,
            $table,
            $recordUid,
            $stageId,
            $items,
            $this->backendUserId()
        );

        return new JsonResponse([
            'success' => true,
            'items' => $this->checklistStateService->getItemsWithState($workspaceId, $table, $recordUid, $stageId),
        ]);
    }

    public function toggleAction(ServerRequestInterface $request): ResponseInterface
    {
        $parsed = $this->parseRequest($request);
        if ($parsed instanceof JsonResponse) {
            return $parsed;
        }
        [$data, $table, $recordUid, $workspaceId, $stageId] = $parsed;

        $itemUid = (int)($data['checklist_item_uid'] ?? $data['item_uid'] ?? 0);
        if ($itemUid <= 0) {
            return $this->errorResponse('Invalid parameters');
        }

        $this->checklistStateService->toggleItem(
            $workspaceId,
            $table,
            $recordUid,
            $stageId,
            $itemUid,
            (bool)($data['checked'] ?? false),
            $this->backendUserId()
        );

        return new JsonResponse([
            'success' => true,
            'items' => $this->checklistStateService->getItemsWithState($workspaceId, $table, $recordUid, $stageId),
        ]);
    }

    /**
     * @return array{0: array<string, mixed>, 1: string, 2: int, 3: int, 4: int}|JsonResponse
     */
    private function parseRequest(ServerRequestInterface $request): array|JsonResponse
    {
        $data = $this->parsePayload($request);
        if ($data === null) {
            return $this->errorResponse('Invalid payload');
        }

        $table = (string)($data['table'] ?? '');
        $recordUid = (int)($data['record_uid'] ?? 0);
        if ($table === '' || $recordUid <= 0) {
            return $this->errorResponse('Invalid parameters');
        }

        return [
            $data,
            $table,
            $recordUid,
            (int)($data['workspace_id'] ?? $this->getBackendUser()->workspace),
            (int)($data['stage_id'] ?? 0),
        ];
    }

    private function backendUserId(): int
    {
        return (int)($this->getBackendUser()->user['uid'] ?? 0);
    }

    private function errorResponse(string $error): JsonResponse
    {
        return new JsonResponse(['success' => false, 'error' => $error], 400);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function parsePayload(ServerRequestInterface $request): ?array
    {
        $parsedBody = $request->getParsedBody();
        if (is_array($parsedBody)) {
            $data = $parsedBody['data'][0] ?? $parsedBody;
            return is_array($data) ? $data : null;
        }

        $decoded = json_decode((string)$request->getBody(), true);
        if (!is_array($decoded)) {
            return null;
        }
        $data = $decoded['data'][0] ?? $decoded;

        return is_array($data) ? $data : null;
    }

    private function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }
}
