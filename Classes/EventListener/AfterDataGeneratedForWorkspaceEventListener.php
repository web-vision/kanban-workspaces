<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\EventListener;

use WebVision\KanbanWorkspaces\Domain\Model\Dto\EmConfiguration;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent;

#[AsEventListener(
    identifier: 'kanban-workspaces/after-data-generated-for-workspace',
)]
final class AfterDataGeneratedForWorkspaceEventListener
{
    public function __invoke(AfterDataGeneratedForWorkspaceEvent $event): void
    {
        // Get extension configuration
        $emSettings = GeneralUtility::makeInstance(EmConfiguration::class);

        if (empty($emSettings->getDisableDefaultStage())) {
            return;
        }

        $data = $event->getData();
        // Check if data contains records
        if (empty($data) || !is_array($data)) {
            return;
        }

        // Get the default stage ID (typically 0 for "Editing" stage)
        $defaultStageId = 0;
        $customDefaultStageId = (int)$emSettings->getDefaultStageId();

        if ($customDefaultStageId > 0) {
            foreach ($data as &$item) {
                if (isset($item['stage']) && $item['stage'] == $defaultStageId) {
                    $item['stage'] = $customDefaultStageId;
                    // Update the database record with the default stage
                    if (isset($item['table']) && isset($item['uid'])) {
                        $this->updateRecordStage($item['table'], (int)$item['uid'], $customDefaultStageId);
                    }
                }
            }
            // Update the event data
            $event->setData($data);
        }
    }

    /**
     * Update the stage field for a specific record
     */
    private function updateRecordStage(string $table, int $uid, int $stageId): void
    {
        try {
            $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
            $connection = $connectionPool->getConnectionForTable($table);

            $connection->update(
                $table,
                ['t3ver_stage' => $stageId],
                ['uid' => $uid]
            );
        } catch (\Exception $e) {
            throw new \RuntimeException(
                'Failed to update record stage: ' . $e->getMessage(),
                (int)$e->getCode(),
                $e
            );
        }
    }
}
