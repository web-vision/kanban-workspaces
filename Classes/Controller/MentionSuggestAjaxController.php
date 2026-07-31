<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Http\JsonResponse;
use WebVision\KanbanWorkspaces\Mention\WorkspaceMentionDirectory;

#[AsController]
final class MentionSuggestAjaxController
{
    public function __construct(
        private readonly WorkspaceMentionDirectory $mentionDirectory,
    ) {
    }

    public function suggestAction(ServerRequestInterface $request): ResponseInterface
    {
        $params = array_merge($request->getQueryParams(), (array)$request->getParsedBody());
        $workspaceId = (int)($params['workspace'] ?? $this->getBackendUser()->workspace);
        $query = trim((string)($params['q'] ?? $params['query'] ?? ''));

        if ($workspaceId < 1 || $workspaceId !== (int)$this->getBackendUser()->workspace) {
            return new JsonResponse(['success' => false, 'error' => 'Invalid workspace'], 403);
        }

        if (mb_strlen($query) > 100) {
            $query = mb_substr($query, 0, 100);
        }

        $suggestions = $this->mentionDirectory->suggest($workspaceId, $query, $request);
        $items = array_map(static fn ($item) => $item->toArray(), $suggestions);

        return new JsonResponse([
            'success' => true,
            'items' => $items,
        ]);
    }

    private function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }
}
