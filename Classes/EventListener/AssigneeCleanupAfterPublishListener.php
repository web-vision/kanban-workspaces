<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Workspaces\Event\AfterRecordPublishedEvent;
use WebVision\KanbanWorkspaces\Service\AssigneeMappingService;

final class AssigneeCleanupAfterPublishListener
{
    public function __construct(
        private readonly AssigneeMappingService $assigneeMappingService,
    ) {
    }

    #[AsEventListener(identifier: 'kanban-workspaces/assignee-cleanup-after-publish')]
    public function __invoke(AfterRecordPublishedEvent $event): void
    {
        $this->assigneeMappingService->cleanupForPublished(
            $event->getTable(),
            $event->getRecordId(),
            $event->getWorkspaceId()
        );
    }
}
