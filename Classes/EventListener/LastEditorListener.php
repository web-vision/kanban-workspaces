<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent;
use WebVision\KanbanWorkspaces\Backend\BackendUserAvatarResolver;

/**
 * Adds the backend user who made the latest change of the workspace version
 * (`last_editor_uid`, `last_editor_username`, `last_editor_realname`, `last_editor_avatar_url`)
 * to the workspace grid entries, so the cards can show the avatar of that user.
 *
 * The user is taken from the record history (sys_history) of the workspace version. Stage
 * changes and publishing are not counted as a change. Entries without a history get no user.
 */
final readonly class LastEditorListener
{
    /**
     * History actions that change the record itself.
     */
    private const CHANGE_ACTIONS = [
        RecordHistoryStore::ACTION_ADD,
        RecordHistoryStore::ACTION_MODIFY,
        RecordHistoryStore::ACTION_MOVE,
        RecordHistoryStore::ACTION_DELETE,
        RecordHistoryStore::ACTION_UNDELETE,
    ];

    public function __construct(
        private ConnectionPool $connectionPool,
        private BackendUserAvatarResolver $backendUserAvatarResolver,
    ) {
    }

    #[AsEventListener(identifier: 'kanban-workspaces/last-editor')]
    public function __invoke(AfterDataGeneratedForWorkspaceEvent $event): void
    {
        $data = $event->getData();
        $uidsByTable = [];
        foreach ($data as $item) {
            if (is_array($item) && isset($item['table'], $item['uid'])) {
                $uidsByTable[(string)$item['table']][] = (int)$item['uid'];
            }
        }
        $editors = [];
        foreach ($uidsByTable as $table => $uids) {
            $editors[$table] = $this->getLastEditors($table, $uids);
        }
        $users = $this->getUsers(array_merge([], ...array_values(array_map('array_values', $editors))));
        foreach ($data as $key => $item) {
            if (!is_array($item) || !isset($item['table'], $item['uid'])) {
                continue;
            }
            $user = $users[$editors[(string)$item['table']][(int)$item['uid']] ?? 0] ?? null;
            $data[$key]['last_editor_uid'] = $user['uid'] ?? null;
            $data[$key]['last_editor_username'] = $user['username'] ?? null;
            $data[$key]['last_editor_realname'] = $user['realName'] ?? null;
            $data[$key]['last_editor_avatar_url'] = $user['avatarUrl'] ?? null;
        }
        $event->setData($data);
    }

    /**
     * @param list<int> $uids
     * @return array<int, int> backend user uid by record uid
     */
    private function getLastEditors(string $table, array $uids): array
    {
        $editors = [];
        // chunked to stay below the parameter limit of the database
        foreach (array_chunk(array_unique($uids), 1000) as $chunk) {
            $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_history');
            $result = $queryBuilder
                ->select('recuid', 'userid')
                ->from('sys_history')
                ->where(
                    $queryBuilder->expr()->eq('tablename', $queryBuilder->createNamedParameter($table)),
                    $queryBuilder->expr()->in('recuid', $queryBuilder->createNamedParameter($chunk, Connection::PARAM_INT_ARRAY)),
                    $queryBuilder->expr()->in('actiontype', $queryBuilder->createNamedParameter(self::CHANGE_ACTIONS, Connection::PARAM_INT_ARRAY)),
                    $queryBuilder->expr()->gt('userid', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT))
                )
                ->orderBy('tstamp', 'DESC')
                ->addOrderBy('uid', 'DESC')
                ->executeQuery();
            while ($row = $result->fetchAssociative()) {
                // newest first, so the first entry of a record wins
                $editors[(int)$row['recuid']] ??= (int)$row['userid'];
            }
        }
        return $editors;
    }

    /**
     * @param list<int> $userIds
     * @return array<int, array{uid: int, username: string, realName: string, avatarUrl: string|null}>
     */
    private function getUsers(array $userIds): array
    {
        $userIds = array_values(array_unique($userIds));
        if ($userIds === []) {
            return [];
        }
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('be_users');
        // deleted or disabled users made their changes all the same
        $queryBuilder->getRestrictions()->removeAll();
        $result = $queryBuilder
            ->select('uid', 'username', 'realName')
            ->from('be_users')
            ->where($queryBuilder->expr()->in('uid', $queryBuilder->createNamedParameter($userIds, Connection::PARAM_INT_ARRAY)))
            ->executeQuery();
        $users = [];
        while ($row = $result->fetchAssociative()) {
            $uid = (int)$row['uid'];
            $users[$uid] = [
                'uid' => $uid,
                'username' => (string)$row['username'],
                'realName' => (string)$row['realName'],
                'avatarUrl' => $this->backendUserAvatarResolver->resolveAvatarUrl($uid),
            ];
        }
        return $users;
    }
}
