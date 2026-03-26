<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\EventListener;

use WebVision\KanbanWorkspaces\Domain\Model\Dto\EmConfiguration;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
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
                    if (!isset($item['table'], $item['uid'])) {
                        continue;
                    }

                    $table = (string)$item['table'];
                    $uid = (int)$item['uid'];
                    $currentStage = $this->getCurrentStage($table, $uid);

                    // Keep explicit current DB stage when available.
                    if ($currentStage > 0) {
                        $item['stage'] = $currentStage;
                        continue;
                    }

                    // If TYPO3 reset stage to editing (0) after a content update,
                    // restore the latest explicit stage transition for this record.
                    $restoredStage = $this->getLatestHistoricalStage($table, $uid);
                    $targetStage = $restoredStage > 0 ? $restoredStage : $customDefaultStageId;

                    $item['stage'] = $targetStage;

                    if ($targetStage > 0 && $targetStage !== $currentStage) {
                        $this->updateRecordStage($table, $uid, $targetStage);
                    }
                }
            }
            unset($item);
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

    /**
     * Get the current stage for a specific record
     */
    private function getCurrentStage(string $table, int $uid): int
    {
        try {
            $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
            $connection = $connectionPool->getConnectionForTable($table);

            $result = $connection->select(['t3ver_stage'], $table, ['uid' => $uid])->fetchAssociative();
            return (int)($result['t3ver_stage'] ?? 0);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get the latest non-zero stage from record history (stage transitions).
     */
    private function getLatestHistoricalStage(string $table, int $uid): int
    {
        try {
            $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
            $connection = $connectionPool->getConnectionForTable('sys_history');

            $rows = $connection->select(
                ['history_data'],
                'sys_history',
                [
                    'tablename' => $table,
                    'recuid' => $uid,
                    'actiontype' => RecordHistoryStore::ACTION_STAGECHANGE,
                ],
                [],
                ['uid' => 'DESC'],
                25
            )->fetchAllAssociative();

            foreach ($rows as $row) {
                $historyData = json_decode((string)($row['history_data'] ?? ''), true);
                if (!is_array($historyData)) {
                    continue;
                }
                $nextStage = (int)($historyData['next'] ?? 0);
                if ($nextStage > 0) {
                    return $nextStage;
                }
            }
        } catch (\Exception $e) {
            // Fall back to configured default stage when history cannot be read.
        }

        return 0;
    }
}
