<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Service;

use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;

/**
 * Loads checklist item templates for custom and default workspace stages.
 */
final class ChecklistTemplateService
{
    private const TEMPLATE_TABLE = 'tx_kanbanworkspaces_stage_checklist';

    public function __construct(
        private readonly ConnectionPool $connectionPool,
    ) {
    }

    /**
     * @return list<array{id: int, title: string}>
     */
    public function getChecklistForStage(int $stageUid, int $workspaceId = 0): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TEMPLATE_TABLE);
        $constraints = [
            $queryBuilder->expr()->eq('stage', $queryBuilder->createNamedParameter($stageUid, Connection::PARAM_INT)),
            $queryBuilder->expr()->eq('deleted', 0),
        ];

        if ($stageUid < 1) {
            if ($workspaceId < 1) {
                return [];
            }
            $constraints[] = $queryBuilder->expr()->eq(
                'workspace_id',
                $queryBuilder->createNamedParameter($workspaceId, Connection::PARAM_INT)
            );
        }

        $result = $queryBuilder
            ->select('uid', 'title')
            ->from(self::TEMPLATE_TABLE)
            ->where(...$constraints)
            ->orderBy('sorting', 'ASC')
            ->executeQuery();

        $checklistByUid = [];
        $seenTitles = [];
        while ($row = $result->fetchAssociative()) {
            $uid = (int)$row['uid'];
            $title = (string)($row['title'] ?? '');
            if ($title === '' || isset($seenTitles[$title])) {
                continue;
            }
            $seenTitles[$title] = true;
            $checklistByUid[$uid] = [
                'id' => $uid,
                'title' => $title,
            ];
        }

        return array_values($checklistByUid);
    }

    /**
     * Resolve title map for checklist item UIDs (including soft-deleted for history display).
     *
     * @param list<int> $itemUids
     * @return array<int, string>
     */
    public function getTitlesByUids(array $itemUids): array
    {
        $itemUids = array_values(array_unique(array_filter(array_map('intval', $itemUids))));
        if ($itemUids === []) {
            return [];
        }

        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TEMPLATE_TABLE);
        $queryBuilder->getRestrictions()->removeAll();
        $result = $queryBuilder
            ->select('uid', 'title')
            ->from(self::TEMPLATE_TABLE)
            ->where(
                $queryBuilder->expr()->in(
                    'uid',
                    $queryBuilder->createNamedParameter($itemUids, Connection::PARAM_INT_ARRAY)
                )
            )
            ->executeQuery();

        $titles = [];
        while ($row = $result->fetchAssociative()) {
            $titles[(int)$row['uid']] = (string)($row['title'] ?? '');
        }

        return $titles;
    }
}
