<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Http\JsonResponse;
use WebVision\KanbanWorkspaces\Notification\MentionNotificationService;

#[AsController]
final class MentionNotifyAjaxController
{
    public function __construct(
        private readonly MentionNotificationService $mentionNotificationService,
    ) {
    }

    public function notifyAction(ServerRequestInterface $request): ResponseInterface
    {
        $data = $this->parsePayload($request);
        if ($data === null) {
            return new JsonResponse(['success' => false, 'error' => 'Invalid payload'], 400);
        }

        $table = (string)($data['table'] ?? '');
        $recordUid = (int)($data['record_uid'] ?? 0);
        $workspaceId = (int)($data['workspace_id'] ?? $this->getBackendUser()->workspace);
        $stageId = (int)($data['stage_id'] ?? 0);
        $commentHtml = (string)($data['comment'] ?? $data['comments'] ?? '');

        if ($table === '' || $recordUid <= 0 || $commentHtml === '') {
            return new JsonResponse(['success' => false, 'error' => 'Invalid parameters'], 400);
        }

        if ($workspaceId !== (int)$this->getBackendUser()->workspace) {
            return new JsonResponse(['success' => false, 'error' => 'Invalid workspace'], 403);
        }

        $authorId = (int)($this->getBackendUser()->user['uid'] ?? 0);
        $result = $this->mentionNotificationService->notifyFromComment(
            $commentHtml,
            $table,
            $recordUid,
            $workspaceId,
            $stageId,
            $authorId
        );

        return new JsonResponse([
            'success' => true,
            'notified' => $result['notified'],
            'userIds' => $result['userIds'],
        ]);
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
