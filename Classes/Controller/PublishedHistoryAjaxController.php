<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Http\JsonResponse;
use WebVision\KanbanWorkspaces\Service\PublishedHistoryService;

/**
 * Lists the records published from the current workspace for the "Live" column of the board.
 */
#[AsController]
class PublishedHistoryAjaxController
{
    public function __construct(
        private readonly PublishedHistoryService $publishedHistoryService,
        private readonly Context $context,
    ) {
    }

    public function listAction(ServerRequestInterface $request): ResponseInterface
    {
        $days = $this->getDays($request);
        $now = (int)$this->context->getPropertyFromAspect('date', 'timestamp');
        $records = $this->publishedHistoryService->findPublishedRecords(
            (int)$this->getBackendUser()->workspace,
            $now - $days * 86400
        );

        return new JsonResponse([
            'success' => true,
            'days' => $days,
            'records' => $records,
        ]);
    }

    /**
     * Number of days to look back, from the "days" query parameter (the input in the column header),
     * limited to 1 - MAX_AGE_DAYS. Falls back to the default when the parameter is missing or no number.
     */
    protected function getDays(ServerRequestInterface $request): int
    {
        $days = $request->getQueryParams()['days'] ?? null;
        if (!is_numeric($days)) {
            return PublishedHistoryService::DEFAULT_MAX_AGE_DAYS;
        }
        return max(1, min(PublishedHistoryService::MAX_AGE_DAYS, (int)$days));
    }

    protected function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }
}
