<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Service;

use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Type\Bitmask\Permission;

/**
 * Reads the records that have been published from a workspace out of sys_history.
 *
 * The workspaces DataHandler hook writes a "publish" entry (actiontype 7) for every
 * published record. The entry itself is stored for the live workspace (workspace = 0),
 * the source workspace is only part of the JSON payload (history_data.workspaceId).
 */
class PublishedHistoryService
{
    public const DEFAULT_MAX_AGE_DAYS = 30;
    public const MAX_AGE_DAYS = 365;
    public const DEFAULT_LIMIT = 200;

    /**
     * @var array<int, string>
     */
    protected array $userNames = [];

    /**
     * @var array<int, array<string, mixed>|false>
     */
    protected array $readablePages = [];

    public function __construct(
        protected readonly ConnectionPool $connectionPool,
        protected readonly UriBuilder $backendUriBuilder,
    ) {
    }

    /**
     * Get the records published from the given workspace since the given timestamp, newest first.
     *
     * Only records the backend user may read are returned. Records of tables that are hidden
     * in the backend (ctrl.hideTable, e.g. sys_file_reference) are left out, they are inline
     * children of a record that is listed itself.
     *
     * @return list<array{
     *     id: int,
     *     table: string,
     *     uid: int,
     *     title: string,
     *     type: string,
     *     action: string,
     *     pid: int,
     *     pageTitle: string,
     *     publishedAt: string,
     *     publishedBy: string,
     *     comment: string,
     *     historyUrl: string
     * }>
     */
    public function findPublishedRecords(int $workspaceId, int $since, int $limit = self::DEFAULT_LIMIT): array
    {
        if ($workspaceId <= 0) {
            return [];
        }
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_history');
        $result = $queryBuilder
            ->select('uid', 'tablename', 'recuid', 'userid', 'tstamp', 'history_data')
            ->from('sys_history')
            ->where(
                $queryBuilder->expr()->eq('actiontype', $queryBuilder->createNamedParameter(RecordHistoryStore::ACTION_PUBLISH, Connection::PARAM_INT)),
                $queryBuilder->expr()->gte('tstamp', $queryBuilder->createNamedParameter($since, Connection::PARAM_INT)),
                // pre-filter only, the payload is decoded and checked below
                $queryBuilder->expr()->like(
                    'history_data',
                    $queryBuilder->createNamedParameter('%' . $queryBuilder->escapeLikeWildcards('"workspaceId":' . $workspaceId . ',') . '%')
                )
            )
            ->orderBy('tstamp', 'DESC')
            ->addOrderBy('uid', 'DESC')
            ->setMaxResults($limit)
            ->executeQuery();

        $records = [];
        while ($row = $result->fetchAssociative()) {
            $payload = json_decode((string)$row['history_data'], true);
            if (!is_array($payload) || (int)($payload['workspaceId'] ?? 0) !== $workspaceId) {
                continue;
            }
            $record = $this->buildRecord($row, $payload);
            if ($record !== null) {
                $records[] = $record;
            }
        }
        return $records;
    }

    /**
     * @param array<string, mixed> $historyRow
     * @param array<string, mixed> $payload
     * @return array{
     *     id: int,
     *     table: string,
     *     uid: int,
     *     title: string,
     *     type: string,
     *     action: string,
     *     pid: int,
     *     pageTitle: string,
     *     publishedAt: string,
     *     publishedBy: string,
     *     comment: string,
     *     historyUrl: string
     * }|null
     */
    protected function buildRecord(array $historyRow, array $payload): ?array
    {
        $table = (string)$historyRow['tablename'];
        $uid = (int)$historyRow['recuid'];
        $tableConfiguration = $GLOBALS['TCA'][$table]['ctrl'] ?? null;
        if (!is_array($tableConfiguration) || ($tableConfiguration['hideTable'] ?? false)) {
            return null;
        }
        $backendUser = $this->getBackendUser();
        if (!$backendUser->check('tables_select', $table)) {
            return null;
        }
        // deleted records are included: publishing a delete placeholder deletes the live record
        $record = BackendUtility::getRecord($table, $uid, '*', '', false);
        if ($record === null) {
            return null;
        }
        $pageId = $table === 'pages' ? $uid : (int)$record['pid'];
        $page = $this->getReadablePage($pageId);
        if ($page === false) {
            return null;
        }

        return [
            'id' => (int)$historyRow['uid'],
            'table' => $table,
            'uid' => $uid,
            'title' => BackendUtility::getRecordTitle($table, $record),
            'type' => $this->getLanguageService()->sL((string)($tableConfiguration['title'] ?? $table)) ?: $table,
            'action' => $this->getAction($historyRow, $payload, $record),
            'pid' => $pageId,
            'pageTitle' => (string)($page['title'] ?? ''),
            'publishedAt' => date('c', (int)$historyRow['tstamp']),
            'publishedBy' => $this->getUserName((int)$historyRow['userid']),
            'comment' => (string)($payload['comment'] ?? ''),
            'historyUrl' => (string)$this->backendUriBuilder->buildUriFromRoute('record_history', ['element' => $table . ':' . $uid]),
        ];
    }

    /**
     * Derive what the publish did: new records are published without a swap (no "oldRecord" in the
     * payload). Publishing a delete placeholder deletes the live record right before the publish entry
     * is written, so the preceding history entry of the record is a delete entry.
     *
     * @param array<string, mixed> $historyRow
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $record
     */
    protected function getAction(array $historyRow, array $payload, array $record): string
    {
        if (!array_key_exists('oldRecord', $payload)) {
            return 'new';
        }
        $table = (string)$historyRow['tablename'];
        $deleteField = $GLOBALS['TCA'][$table]['ctrl']['delete'] ?? '';
        if ($deleteField !== '' && ($record[$deleteField] ?? false) && $this->wasDeletedWhenPublished($historyRow)) {
            return 'deleted';
        }
        return 'modified';
    }

    /**
     * @param array<string, mixed> $historyRow
     */
    protected function wasDeletedWhenPublished(array $historyRow): bool
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_history');
        $previousAction = $queryBuilder
            ->select('actiontype')
            ->from('sys_history')
            ->where(
                $queryBuilder->expr()->eq('tablename', $queryBuilder->createNamedParameter((string)$historyRow['tablename'])),
                $queryBuilder->expr()->eq('recuid', $queryBuilder->createNamedParameter((int)$historyRow['recuid'], Connection::PARAM_INT)),
                $queryBuilder->expr()->lt('uid', $queryBuilder->createNamedParameter((int)$historyRow['uid'], Connection::PARAM_INT))
            )
            ->orderBy('uid', 'DESC')
            ->setMaxResults(1)
            ->executeQuery()
            ->fetchOne();
        return (int)$previousAction === RecordHistoryStore::ACTION_DELETE;
    }

    /**
     * @return array<string, mixed>|false
     */
    protected function getReadablePage(int $pageId): array|false
    {
        if (!array_key_exists($pageId, $this->readablePages)) {
            $backendUser = $this->getBackendUser();
            $page = BackendUtility::readPageAccess($pageId, $backendUser->getPagePermsClause(Permission::PAGE_SHOW));
            // readPageAccess() skips deleted pages, so pages removed by publishing a delete
            // placeholder (and the records on them) are only listed for admins
            $this->readablePages[$pageId] = $page === false && $backendUser->isAdmin()
                ? (BackendUtility::getRecord('pages', $pageId, '*', '', false) ?? false)
                : $page;
        }
        return $this->readablePages[$pageId];
    }

    protected function getUserName(int $userId): string
    {
        if (!isset($this->userNames[$userId])) {
            $user = BackendUtility::getRecord('be_users', $userId, 'username,realName', '', false);
            $this->userNames[$userId] = (string)(($user['realName'] ?? '') ?: ($user['username'] ?? ''));
        }
        return $this->userNames[$userId];
    }

    protected function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }

    protected function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }
}
