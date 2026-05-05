<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Service;

use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;

class AssigneeMappingService
{
    public function __construct(
        private readonly ConnectionPool $connectionPool,
    ) {
    }

    public function persistAssignmentWithMeta(
        int $beUserId,
        string $tableName,
        int $recordUid,
        int $workspaceId,
        int $stageId,
        string $title = '',
        string $description = ''
    ): void {
        $connection = $this->connectionPool->getConnectionForTable('sys_workspaces_assignee');
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

    /**
     * Set t3ver_assignee on the versioned record to the assignee mapping UID.
     * Only runs if the table has the t3ver_assignee column in TCA.
     */
    public function setRecordAssignee(string $tableName, int $recordUid, int $workspaceId, int $assigneeMappingUid): void
    {
        if (!$this->tableHasT3verAssignee($tableName)) {
            return;
        }
        $connection = $this->connectionPool->getConnectionForTable($tableName);
        $connection->update(
            $tableName,
            ['t3ver_assignee' => $assigneeMappingUid],
            [
                'uid' => $recordUid,
                't3ver_wsid' => $workspaceId,
            ],
            ['t3ver_assignee' => Connection::PARAM_INT]
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
        $connection = $this->connectionPool->getConnectionForTable($tableName);
        $connection->update(
            $tableName,
            ['t3ver_assignee' => 0],
            ['uid' => $recordUid],
            ['t3ver_assignee' => Connection::PARAM_INT]
        );
    }

    public function cleanupForPublished(string $tableName, int $recordUid, int $workspaceId): void
    {
        $connection = $this->connectionPool->getConnectionForTable('sys_workspaces_assignee');
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
     * Look up the most recent assignee (`be_users.uid`) for the given workspace record.
     * Returns `null` when no mapping exists.
     */
    public function findLatestAssigneeBeUserIdForRecord(int $workspaceId, string $tableName, int $recordUid): ?int
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_workspaces_assignee');
        $row = $queryBuilder
            ->select('be_user')
            ->from('sys_workspaces_assignee')
            ->where(
                $queryBuilder->expr()->eq('table_name', $queryBuilder->createNamedParameter($tableName)),
                $queryBuilder->expr()->eq('record_uid', $queryBuilder->createNamedParameter($recordUid, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('workspace_id', $queryBuilder->createNamedParameter($workspaceId, Connection::PARAM_INT))
            )
            ->orderBy('tstamp', 'DESC')
            ->setMaxResults(1)
            ->executeQuery()
            ->fetchAssociative();
        if ($row === false || empty($row['be_user'])) {
            return null;
        }
        return (int)$row['be_user'];
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
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_workspaces_assignee');
        $result = $queryBuilder
            ->select('uid')
            ->from('sys_workspaces_assignee')
            ->where(
                $queryBuilder->expr()->eq('workspace_id', $queryBuilder->createNamedParameter($workspaceId, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('table_name', $queryBuilder->createNamedParameter($tableName)),
                $queryBuilder->expr()->eq('record_uid', $queryBuilder->createNamedParameter($recordUid, Connection::PARAM_INT))
            )
            ->setMaxResults(1)
            ->executeQuery();
        $row = $result->fetchAssociative();
        return $row ? (int)$row['uid'] : 0;
    }
}
