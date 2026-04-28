<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Workspaces\Event\AfterRecordPublishedEvent;
use WebVision\KanbanWorkspaces\Service\AssigneeMappingService;

#[AsEventListener(
    identifier: 'kanban-workspaces/assignee-cleanup-after-publish',
)]
final class AssigneeCleanupAfterPublishListener
{
    public function __invoke(AfterRecordPublishedEvent $event): void
    {
        $service = GeneralUtility::makeInstance(AssigneeMappingService::class);
        $service->cleanupForPublished(
            $event->getTable(),
            $event->getRecordId(),
            $event->getWorkspaceId()
        );
    }
}
