<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Service;

use Doctrine\DBAL\ParameterType;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;

class AssigneeMappingService
{
    public function persistAssignmentWithMeta(
        int $beUserId,
        string $tableName,
        int $recordUid,
        int $workspaceId,
        int $stageId,
        string $title = '',
        string $description = ''
    ): void {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('sys_workspaces_assignee');
        $now = time();
        // If a mapping already exists for this record (workspace + table + record_uid), update it with the new assignee.
        $affected = $connection->update(
            'sys_workspaces_assignee',
            [
                'be_user' => $beUserId,
                'tstamp' => $now,
                'stage_id' => $stageId,
                'title' => $title,
                'description' => $description !== '' ? $description : null,
            ],
            [
                'workspace_id' => $workspaceId,
                'table_name' => $tableName,
                'record_uid' => $recordUid,
            ]
        );
        $mappingUid = 0;
        if ($affected === 0) {
            $connection->insert('sys_workspaces_assignee', [
                'pid' => 0,
                'tstamp' => $now,
                'crdate' => $now,
                'title' => $title,
                'description' => $description !== '' ? $description : null,
                'be_user' => $beUserId,
                'table_name' => $tableName,
                'record_uid' => $recordUid,
                'workspace_id' => $workspaceId,
                'stage_id' => $stageId,
            ]);
            $mappingUid = (int)$connection->lastInsertId();
        } else {
            $mappingUid = $this->getMappingUidByRecord($workspaceId, $tableName, $recordUid);
        }
        if ($mappingUid > 0) {
            $this->setRecordAssignee($tableName, $recordUid, $workspaceId, $mappingUid);
        }
    }

    public function persistAssignment(
        int $beUserId,
        string $tableName,
        int $recordUid,
        int $workspaceId,
        int $stageId
    ): void {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('sys_workspaces_assignee');
        $now = time();
        // If a mapping already exists for this record (workspace + table + record_uid), update it with the new assignee.
        $affected = $connection->update(
            'sys_workspaces_assignee',
            [
                'be_user' => $beUserId,
                'tstamp' => $now,
                'stage_id' => $stageId,
            ],
            [
                'workspace_id' => $workspaceId,
                'table_name' => $tableName,
                'record_uid' => $recordUid,
            ]
        );
        $mappingUid = 0;
        if ($affected === 0) {
            $connection->insert('sys_workspaces_assignee', [
                'pid' => 0,
                'tstamp' => $now,
                'crdate' => $now,
                'title' => '',
                'description' => null,
                'be_user' => $beUserId,
                'table_name' => $tableName,
                'record_uid' => $recordUid,
                'workspace_id' => $workspaceId,
                'stage_id' => $stageId,
            ]);
            $mappingUid = (int)$connection->lastInsertId();
        } else {
            $mappingUid = $this->getMappingUidByRecord($workspaceId, $tableName, $recordUid);
        }
        if ($mappingUid > 0) {
            $this->setRecordAssignee($tableName, $recordUid, $workspaceId, $mappingUid);
        }
    }

    /**
     * Set t3ver_assignee on the versioned record to the assignee mapping UID.
     * Only runs if the table has the t3ver_assignee column in TCA.
     */
    public function setRecordAssignee(string $tableName, int $recordUid, int $workspaceId, int $assigneeMappingUid): void
    {
        if (!$this->tableHasT3verAssignee($tableName)) {
            return;
        }
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable($tableName);
        $connection->update(
            $tableName,
            ['t3ver_assignee' => $assigneeMappingUid],
            [
                'uid' => $recordUid,
                't3ver_wsid' => $workspaceId,
            ],
            ['t3ver_assignee' => ParameterType::INTEGER]
        );
    }

    /**
     * Clear t3ver_assignee on a record (e.g. after publish).
     * Only runs if the table has the t3ver_assignee column in TCA.
     */
    public function clearRecordAssignee(string $tableName, int $recordUid): void
    {
        if (!$this->tableHasT3verAssignee($tableName)) {
            return;
        }
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable($tableName);
        $connection->update(
            $tableName,
            ['t3ver_assignee' => 0],
            ['uid' => $recordUid],
            ['t3ver_assignee' => ParameterType::INTEGER]
        );
    }

    public function cleanupForPublished(string $tableName, int $recordUid, int $workspaceId): void
    {
        $connection = GeneralUtility::makeInstance(ConnectionPool::class)->getConnectionForTable('sys_workspaces_assignee');
        $connection->delete('sys_workspaces_assignee', [
            'table_name' => $tableName,
            'record_uid' => $recordUid,
            'workspace_id' => $workspaceId,
        ]);
        // Clear t3ver_assignee on the published (live) record so it does not point to a deleted mapping row.
        // AfterRecordPublishedEvent::getRecordId() is the live record uid in both core dispatch sites.
        $this->clearRecordAssignee($tableName, $recordUid);
    }

    /**
     * Whether the table has the t3ver_assignee column in TCA (and thus in schema after DB compare).
     */
    private function tableHasT3verAssignee(string $tableName): bool
    {
        return isset($GLOBALS['TCA'][$tableName]['columns']['t3ver_assignee']);
    }

    /**
     * Get the UID of the assignee mapping row for the given record (workspace + table + record_uid).
     */
    private function getMappingUidByRecord(int $workspaceId, string $tableName, int $recordUid): int
    {
        $queryBuilder = GeneralUtility::makeInstance(ConnectionPool::class)
            ->getQueryBuilderForTable('sys_workspaces_assignee');
        $result = $queryBuilder
            ->select('uid')
            ->from('sys_workspaces_assignee')
            ->where(
                $queryBuilder->expr()->eq('workspace_id', $queryBuilder->createNamedParameter($workspaceId, ParameterType::INTEGER)),
                $queryBuilder->expr()->eq('table_name', $queryBuilder->createNamedParameter($tableName)),
                $queryBuilder->expr()->eq('record_uid', $queryBuilder->createNamedParameter($recordUid, ParameterType::INTEGER))
            )
            ->setMaxResults(1)
            ->executeQuery();
        $row = $result->fetchAssociative();
        return $row ? (int)$row['uid'] : 0;
    }

    public static function getCurrentBeUserId(): int
    {
        /** @var BackendUserAuthentication|null $beUser */
        $beUser = $GLOBALS['BE_USER'] ?? null;
        return $beUser ? (int)$beUser->user['uid'] : 0;
    }
}
