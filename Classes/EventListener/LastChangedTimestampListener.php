<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent;

/**
 * Adds the timestamp of the last change of the workspace version (`lastChanged`) to the
 * workspace grid entries, so the board can sort the cards by it. `GridDataService` only
 * provides `lastChangedFormatted`, formatted with the configured date format and without
 * seconds.
 */
final readonly class LastChangedTimestampListener
{
    public function __construct(
        private ConnectionPool $connectionPool,
    ) {
    }

    #[AsEventListener(identifier: 'kanban-workspaces/last-changed-timestamp')]
    public function __invoke(AfterDataGeneratedForWorkspaceEvent $event): void
    {
        $data = $event->getData();
        $uidsByTable = [];
        foreach ($data as $item) {
            if (is_array($item) && isset($item['table'], $item['uid'])) {
                $uidsByTable[(string)$item['table']][] = (int)$item['uid'];
            }
        }
        $timestamps = [];
        foreach ($uidsByTable as $table => $uids) {
            $timestamps[$table] = $this->getTimestamps($table, $uids);
        }
        foreach ($data as $key => $item) {
            if (is_array($item) && isset($item['table'], $item['uid'])) {
                $data[$key]['lastChanged'] = $timestamps[(string)$item['table']][(int)$item['uid']] ?? 0;
            }
        }
        $event->setData($data);
    }

    /**
     * @param list<int> $uids
     * @return array<int, int> timestamp by uid
     */
    private function getTimestamps(string $table, array $uids): array
    {
        $timestampField = $GLOBALS['TCA'][$table]['ctrl']['tstamp'] ?? '';
        if ($timestampField === '') {
            return [];
        }
        $timestamps = [];
        // chunked to stay below the parameter limit of the database
        foreach (array_chunk(array_unique($uids), 1000) as $chunk) {
            $queryBuilder = $this->connectionPool->getQueryBuilderForTable($table);
            $queryBuilder->getRestrictions()->removeAll();
            $result = $queryBuilder
                ->select('uid', $timestampField)
                ->from($table)
                ->where($queryBuilder->expr()->in('uid', $queryBuilder->createNamedParameter($chunk, Connection::PARAM_INT_ARRAY)))
                ->executeQuery();
            while ($row = $result->fetchAssociative()) {
                $timestamps[(int)$row['uid']] = (int)$row[$timestampField];
            }
        }
        return $timestamps;
    }
}
