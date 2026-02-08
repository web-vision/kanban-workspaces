<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use WebVision\KanbanWorkspaces\Notification\AssignmentNotificationService;
use WebVision\KanbanWorkspaces\Service\AssigneeMappingService;

class AssignAjaxController
{
    public function assignAction(ServerRequestInterface $request): ResponseInterface
    {
        $assigneeMappingService = GeneralUtility::getContainer()->get(AssigneeMappingService::class);
        $assignmentNotificationService = GeneralUtility::getContainer()->get(AssignmentNotificationService::class);
        $parsedBody = $request->getParsedBody();
        $data = null;
        if (is_array($parsedBody)) {
            $data = $parsedBody['data'][0] ?? $parsedBody;
        } else {
            $body = (string)$request->getBody();
            $decoded = json_decode($body, true);
            if (is_array($decoded)) {
                $data = $decoded['data'][0] ?? $decoded;
            }
        }
        if (!is_array($data)) {
            return new JsonResponse(['success' => false, 'error' => 'Invalid payload'], 400);
        }
        $table = (string)($data['table'] ?? '');
        $recordUid = (int)($data['record_uid'] ?? 0);
        $workspaceId = (int)($data['workspace_id'] ?? $this->getBackendUser()->workspace);
        $stageId = (int)($data['stage_id'] ?? 0);
        $beUserId = (int)($data['be_user'] ?? 0);
        $title = (string)($data['title'] ?? '');
        $description = (string)($data['description'] ?? '');

        if ($table === '' || $recordUid <= 0 || $beUserId <= 0) {
            return new JsonResponse(['success' => false, 'error' => 'Invalid parameters'], 400);
        }

        $assigneeMappingService->persistAssignmentWithMeta($beUserId, $table, $recordUid, $workspaceId, $stageId, $title, $description);

        $assignmentNotificationService->notifyAssignee($beUserId, $table, $recordUid, $workspaceId, $stageId, $title, $description);

        return new JsonResponse(['success' => true]);
    }

    protected function getBackendUser(): \TYPO3\CMS\Core\Authentication\BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }
}
