<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Mention;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Workspaces\Service\StagesService;
use WebVision\KanbanWorkspaces\Backend\BackendUserAvatarResolver;
use WebVision\KanbanWorkspaces\Mention\Dto\MentionReference;
use WebVision\KanbanWorkspaces\Mention\Dto\MentionSuggestion;

/**
 * Builds the workspace-scoped mention directory (users + be_groups) and resolves notifications.
 */
class WorkspaceMentionDirectory
{
    private const MAX_USER_SUGGESTIONS = 12;
    private const MAX_GROUP_SUGGESTIONS = 8;

    public function __construct(
        private readonly ConnectionPool $connectionPool,
        private readonly StagesService $stagesService,
        private readonly BackendUserAvatarResolver $avatarResolver,
    ) {
    }

    /**
     * @return list<MentionSuggestion>
     */
    public function suggest(int $workspaceId, string $query, ?ServerRequestInterface $request = null): array
    {
        $query = trim($query);
        $directory = $this->getDirectory($workspaceId, $request);
        $users = $directory['users'];
        $groups = $directory['groups'];

        if ($query !== '') {
            $needle = mb_strtolower($query);
            $users = array_values(array_filter(
                $users,
                static fn(MentionSuggestion $item): bool => self::matchesNeedle($item, $needle)
            ));
            $groups = array_values(array_filter(
                $groups,
                static fn(MentionSuggestion $item): bool => self::matchesNeedle($item, $needle)
            ));
        }

        // Reserve slots so groups are not crowded out by a long user list.
        return array_merge(
            array_slice($users, 0, self::MAX_USER_SUGGESTIONS),
            array_slice($groups, 0, self::MAX_GROUP_SUGGESTIONS)
        );
    }

    private static function matchesNeedle(MentionSuggestion $item, string $needle): bool
    {
        $haystacks = [
            $item->text,
            ltrim($item->text, '@'),
            (string)$item->username,
            (string)$item->email,
            (string)$item->role,
        ];
        foreach ($haystacks as $haystack) {
            if ($haystack !== '' && str_contains(mb_strtolower($haystack), $needle)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @return array{users: list<MentionSuggestion>, groups: list<MentionSuggestion>}
     */
    public function getDirectory(int $workspaceId, ?ServerRequestInterface $request = null): array
    {
        $workspace = BackendUtility::getRecord('sys_workspace', $workspaceId);
        if (!is_array($workspace)) {
            return ['users' => [], 'groups' => []];
        }

        $memberList = trim((string)($workspace['adminusers'] ?? '') . ',' . (string)($workspace['members'] ?? ''), ',');
        $userIds = $this->stagesService->resolveBackendUserIds($memberList);
        $groupIds = $this->extractGroupIds($memberList);

        // Include responsible persons from custom stages of this workspace.
        foreach ($this->collectStageResponsibleLists($workspaceId) as $list) {
            $userIds = array_merge($userIds, $this->stagesService->resolveBackendUserIds($list));
            $groupIds = array_merge($groupIds, $this->extractGroupIds($list));
        }
        $userIds = $this->uniquePositiveIds($userIds);

        // Workspace membership often stores only users (or is empty). Fall back to all
        // active BE users so @mention matches the assignee picker pool.
        if ($userIds === []) {
            $userIds = $this->loadAllActiveBackendUserIds();
        }

        // Groups: workspace be_groups_* entries + usergroups of mentionable users.
        // Only keep groups that actually have members (do not list empty groups).
        $groupIds = $this->uniquePositiveIds(array_merge($groupIds, $this->collectGroupIdsFromUsers($userIds)));

        $ownerIds = array_flip($this->stagesService->resolveBackendUserIds((string)($workspace['adminusers'] ?? '')));

        $users = [];
        $userRecords = $this->stagesService->getBackendUsers($userIds);
        foreach ($userRecords as $uid => $record) {
            $uid = (int)$uid;
            $username = (string)($record['username'] ?? '');
            $realName = trim((string)($record['realName'] ?? ''));
            $label = $realName !== '' ? $realName : $username;
            $role = isset($ownerIds[$uid]) ? 'Owner' : 'Member';
            $users[] = new MentionSuggestion(
                type: MentionReference::TYPE_USER,
                uid: $uid,
                text: '@' . ($username !== '' ? $username : $label),
                id: '@user:' . $uid,
                email: (string)($record['email'] ?? ''),
                username: $username,
                role: $role,
                avatarUrl: $this->avatarResolver->resolveAvatarUrl($uid, $request),
            );
        }
        usort($users, static fn(MentionSuggestion $a, MentionSuggestion $b): int => strcasecmp($a->text, $b->text));

        $groups = [];
        foreach ($this->loadGroups($groupIds) as $group) {
            $uid = (int)$group['uid'];
            $title = (string)($group['title'] ?? ('Group ' . $uid));
            $memberUserIds = $this->stagesService->resolveBackendUserIds('be_groups_' . $uid);
            // Skip groups with no assigned backend users.
            if ($memberUserIds === []) {
                continue;
            }
            $groups[] = new MentionSuggestion(
                type: MentionReference::TYPE_GROUP,
                uid: $uid,
                text: '@' . $title,
                id: '@group:' . $uid,
                role: 'Group',
                memberCount: count($memberUserIds),
                memberUserIds: $memberUserIds,
            );
        }
        usort($groups, static fn(MentionSuggestion $a, MentionSuggestion $b): int => strcasecmp($a->text, $b->text));

        return ['users' => $users, 'groups' => $groups];
    }

    /**
     * Expand mentions to unique active backend user IDs (excluding $excludeUserId).
     * Group mentions expand to every member of that BE user group.
     *
     * @param list<MentionReference> $mentions
     * @return list<int>
     */
    public function resolveMentionedUserIds(array $mentions, int $excludeUserId = 0): array
    {
        $userIds = [];
        foreach ($mentions as $mention) {
            if ($mention->isUser()) {
                $userIds[] = $mention->uid;
            } elseif ($mention->isGroup()) {
                $userIds = array_merge(
                    $userIds,
                    $this->stagesService->resolveBackendUserIds('be_groups_' . $mention->uid)
                );
            }
        }
        $userIds = array_values(array_unique(array_filter(
            $userIds,
            static fn(int $id): bool => $id > 0 && $id !== $excludeUserId
        )));
        if ($userIds === []) {
            return [];
        }
        // Restrict to enabled users with BEenableFields semantics.
        $active = $this->stagesService->getBackendUsers($userIds);
        return array_map('intval', array_keys($active));
    }

    /**
     * @param list<int> $userIds
     * @return list<array{uid: int, email: string, realName: string, username: string, lang: string}>
     */
    public function getNotifiableRecipients(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }
        $records = $this->stagesService->getBackendUsers($userIds);
        $recipients = [];
        $seenEmails = [];
        foreach ($records as $uid => $record) {
            $email = trim((string)($record['email'] ?? ''));
            if ($email === '' || !GeneralUtility::validEmail($email) || isset($seenEmails[$email])) {
                continue;
            }
            $seenEmails[$email] = true;
            $recipients[] = [
                'uid' => (int)$uid,
                'email' => $email,
                'realName' => (string)($record['realName'] ?? $record['username'] ?? ''),
                'username' => (string)($record['username'] ?? ''),
                'lang' => (string)($record['lang'] ?? 'default'),
            ];
        }
        return $recipients;
    }

    /**
     * @return list<int>
     */
    private function extractGroupIds(string $backendUserGroupList): array
    {
        $ids = [];
        foreach (GeneralUtility::trimExplode(',', $backendUserGroupList, true) as $element) {
            if (str_starts_with($element, 'be_groups_')) {
                $ids[] = (int)str_replace('be_groups_', '', $element);
            }
        }
        return $ids;
    }

    /**
     * Collect BE group UIDs from the usergroup field of the given users.
     *
     * @param list<int> $userIds
     * @return list<int>
     */
    private function collectGroupIdsFromUsers(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('be_users');
        $rows = $queryBuilder
            ->select('usergroup')
            ->from('be_users')
            ->where(
                $queryBuilder->expr()->in(
                    'uid',
                    $queryBuilder->createNamedParameter($userIds, Connection::PARAM_INT_ARRAY)
                )
            )
            ->executeQuery()
            ->fetchAllAssociative();

        $groupIds = [];
        foreach ($rows as $row) {
            foreach (GeneralUtility::intExplode(',', (string)($row['usergroup'] ?? ''), true) as $groupId) {
                if ($groupId > 0) {
                    $groupIds[] = $groupId;
                }
            }
        }
        return $groupIds;
    }

    /**
     * @return list<string>
     */
    private function collectStageResponsibleLists(int $workspaceId): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_workspace_stage');
        $rows = $queryBuilder
            ->select('responsible_persons')
            ->from('sys_workspace_stage')
            ->where(
                $queryBuilder->expr()->eq(
                    'parentid',
                    $queryBuilder->createNamedParameter($workspaceId, Connection::PARAM_INT)
                )
            )
            ->executeQuery()
            ->fetchAllAssociative();
        $lists = [];
        foreach ($rows as $row) {
            $value = trim((string)($row['responsible_persons'] ?? ''));
            if ($value !== '') {
                $lists[] = $value;
            }
        }
        return $lists;
    }

    /**
     * @param list<int> $groupIds
     * @return list<array<string, mixed>>
     */
    private function loadGroups(array $groupIds): array
    {
        if ($groupIds === []) {
            return [];
        }
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('be_groups');
        return $queryBuilder
            ->select('uid', 'title')
            ->from('be_groups')
            ->where(
                $queryBuilder->expr()->in(
                    'uid',
                    $queryBuilder->createNamedParameter($groupIds, Connection::PARAM_INT_ARRAY)
                )
            )
            ->orderBy('title', 'ASC')
            ->executeQuery()
            ->fetchAllAssociative();
    }

    /**
     * @return list<int>
     */
    private function loadAllActiveBackendUserIds(): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('be_users');
        $rows = $queryBuilder
            ->select('uid')
            ->from('be_users')
            ->orderBy('username', 'ASC')
            ->executeQuery()
            ->fetchAllAssociative();

        return $this->uniquePositiveIds(array_map(
            static fn(array $row): int => (int)($row['uid'] ?? 0),
            $rows
        ));
    }

    /**
     * @param list<int> $ids
     * @return list<int>
     */
    private function uniquePositiveIds(array $ids): array
    {
        return array_values(array_unique(array_filter(
            $ids,
            static fn(int $id): bool => $id > 0
        )));
    }
}
