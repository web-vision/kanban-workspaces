<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Hooks;

use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\CMS\Core\Utility\MathUtility;
use WebVision\KanbanWorkspaces\Configuration\EmConfiguration;

/**
 * @todo `processDatamap_afterDatabaseOperations` seems not the proper stage, it would be better to modify
 *       the stage before it is persisted to safe roundtrips in case it get reset. Analyse this deeper in
 *       the aftermath and adjust it.
 * @todo This class nees rework and harding; also test coverage is missing.
 */
final class DefaultStageDataHandlerHook
{
    public function __construct(
        private readonly ConnectionPool $connectionPool,
        private readonly EmConfiguration $emConfiguration,
    ) {
    }

    /**
     * @param string $status
     * @param string $table
     * @param int|string $id
     * @param array<string, mixed> $fieldArray
     * @param DataHandler $dataHandler
     */
    public function processDatamap_afterDatabaseOperations(
        string $status,
        string $table,
        int|string $id,
        array $fieldArray,
        DataHandler $dataHandler,
    ): void {
        if (!$this->emConfiguration->getDisableDefaultStage()) {
            return;
        }

        $customDefaultStageId = $this->emConfiguration->getDefaultStageId();
        if ($customDefaultStageId <= 0) {
            return;
        }

        $uid = $this->resolveUid($status, $id, $dataHandler);
        if ($uid <= 0) {
            return;
        }

        $recordState = $this->getRecordWorkspaceState($table, $uid);
        if ($recordState === null) {
            return;
        }

        if ($recordState['workspaceId'] <= 0) {
            return;
        }

        // Repair broken custom stage references (e.g. stage deleted or from another workspace).
        if ($recordState['stage'] > 0
            && !$this->isValidCustomStageForWorkspace($recordState['workspaceId'], $recordState['stage'])
        ) {
            $fallbackStage = $this->resolveValidTargetStage($table, $uid, $recordState['workspaceId'], $customDefaultStageId);
            if ($fallbackStage > 0) {
                $this->updateRecordStage($table, $uid, $fallbackStage);
            } else {
                // Fall back to TYPO3 internal editing stage.
                $this->updateRecordStage($table, $uid, 0);
            }
            return;
        }

        // Keep original behavior for records currently in editing stage.
        if ($recordState['stage'] !== 0) {
            return;
        }

        // If TYPO3 reset stage to editing (0) after a content update,
        // restore the latest explicit stage transition for this record.
        $targetStage = $this->resolveValidTargetStage($table, $uid, $recordState['workspaceId'], $customDefaultStageId);
        if ($targetStage <= 0) {
            return;
        }

        $this->updateRecordStage($table, $uid, $targetStage);
    }

    private function resolveUid(string $status, int|string $id, DataHandler $dataHandler): int
    {
        if (MathUtility::canBeInterpretedAsInteger($id)) {
            return (int)$id;
        }
        if ($status === 'new' && is_string($id) && array_key_exists($id, $dataHandler->substNEWwithIDs)) {
            return (int)$dataHandler->substNEWwithIDs[$id];
        }
        return 0;
    }

    /**
     * @return array{stage:int,workspaceId:int}|null
     */
    private function getRecordWorkspaceState(string $table, int $uid): ?array
    {
        try {
            $connection = $this->connectionPool->getConnectionForTable($table);
            $result = $connection->select(
                ['t3ver_stage', 't3ver_wsid'],
                $table,
                ['uid' => $uid]
            )->fetchAssociative();

            if (!is_array($result)) {
                return null;
            }

            return [
                'stage' => (int)($result['t3ver_stage'] ?? 0),
                'workspaceId' => (int)($result['t3ver_wsid'] ?? 0),
            ];
        } catch (\Exception $e) {
            return null;
        }
    }

    private function updateRecordStage(string $table, int $uid, int $stageId): void
    {
        try {
            $connection = $this->connectionPool->getConnectionForTable($table);
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

    private function isValidCustomStageForWorkspace(int $workspaceId, int $stageId): bool
    {
        if ($workspaceId <= 0 || $stageId <= 0) {
            return false;
        }

        try {
            $connection = $this->connectionPool->getConnectionForTable('sys_workspace_stage');
            return $connection->select(
                ['uid'],
                'sys_workspace_stage',
                [
                    'uid' => $stageId,
                    'parentid' => $workspaceId,
                    'deleted' => 0,
                ]
            )->fetchAssociative() !== false;
        } catch (\Throwable) {
            return false;
        }
    }

    private function resolveValidTargetStage(string $table, int $uid, int $workspaceId, int $customDefaultStageId): int
    {
        $restoredStage = $this->getLatestHistoricalStage($table, $uid);
        if ($restoredStage > 0 && $this->isValidCustomStageForWorkspace($workspaceId, $restoredStage)) {
            return $restoredStage;
        }

        if ($customDefaultStageId > 0 && $this->isValidCustomStageForWorkspace($workspaceId, $customDefaultStageId)) {
            return $customDefaultStageId;
        }

        return 0;
    }

    /**
     * Get the latest non-zero stage from record history (stage transitions).
     */
    private function getLatestHistoricalStage(string $table, int $uid): int
    {
        try {
            $connection = $this->connectionPool->getConnectionForTable('sys_history');
            $result = $connection->select(
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
            );
            while ($row = $result->fetchAssociative()) {
                $historyData = json_decode((string)($row['history_data'] ?? ''), true);
                if (!is_array($historyData)) {
                    continue;
                }
                $nextStage = (int)($historyData['next'] ?? 0);
                if ($nextStage > 0) {
                    return $nextStage;
                }
            }
        } catch (\Throwable) {
            // Fall back to configured default stage when history cannot be read.
        }
        return 0;
    }
}
