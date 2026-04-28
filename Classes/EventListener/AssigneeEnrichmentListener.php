<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Resource\Exception\ResourceDoesNotExistException;
use TYPO3\CMS\Core\Resource\ResourceFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent;

/**
 * Enriches workspace data with assignee from sys_workspaces_assignee so cards can display assignee.
 * Includes assignee avatar URL from be_users.avatar (FAL) when available.
 */
#[AsEventListener(
    identifier: 'kanban-workspaces/assignee-enrichment',
    after: 'kanban-workspaces/after-data-generated-for-workspace',
)]
final class AssigneeEnrichmentListener
{
    public function __invoke(AfterDataGeneratedForWorkspaceEvent $event): void
    {
        $data = $event->getData();
        if (empty($data) || !is_array($data)) {
            return;
        }

        $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
        $assigneeConn = $connectionPool->getConnectionForTable('sys_workspaces_assignee');
        $beUsersConn = $connectionPool->getConnectionForTable('be_users');

        foreach ($data as &$item) {
            $item['assignee_uid'] = null;
            $item['assignee_username'] = null;
            $item['assignee_avatar_url'] = null;
            $tableName = $item['table'] ?? '';
            $uid = isset($item['uid']) ? (int)$item['uid'] : 0;
            $workspaceId = isset($item['t3ver_wsid']) ? (int)$item['t3ver_wsid'] : 0;
            if ($tableName === '' || $uid <= 0 || $workspaceId <= 0) {
                continue;
            }
            $row = $assigneeConn->executeQuery(
                'SELECT be_user FROM sys_workspaces_assignee WHERE table_name = ? AND record_uid = ? AND workspace_id = ? ORDER BY tstamp DESC LIMIT 1',
                [$tableName, $uid, $workspaceId],
                ['string', 'integer', 'integer']
            )->fetchAssociative();
            if ($row && !empty($row['be_user'])) {
                $beUserId = (int)$row['be_user'];
                $item['assignee_uid'] = $beUserId;
                $userRow = $beUsersConn->executeQuery(
                    'SELECT username FROM be_users WHERE uid = ?',
                    [$beUserId],
                    ['integer']
                )->fetchAssociative();
                if ($userRow && isset($userRow['username'])) {
                    $item['assignee_username'] = $userRow['username'];
                }
                $item['assignee_avatar_url'] = $this->getAvatarUrlForBeUser($beUserId);
            }
        }
        unset($item);
        $event->setData($data);
    }

    /**
     * Resolve avatar image URL for a backend user (be_users.avatar FAL field).
     * Returns full URL or null if no avatar or on error.
     */
    private function getAvatarUrlForBeUser(int $beUserId): ?string
    {
        try {
            $connectionPool = GeneralUtility::makeInstance(ConnectionPool::class);
            $refRow = $connectionPool->getConnectionForTable('sys_file_reference')->executeQuery(
                'SELECT uid FROM sys_file_reference WHERE uid_foreign = ? AND tablenames = ? AND fieldname = ? AND deleted = 0 LIMIT 1',
                [$beUserId, 'be_users', 'avatar'],
                ['integer', 'string', 'string']
            )->fetchAssociative();
            if (!$refRow || empty($refRow['uid'])) {
                return null;
            }
            $resourceFactory = GeneralUtility::makeInstance(ResourceFactory::class);
            $fileReference = $resourceFactory->getFileReferenceObject((int)$refRow['uid']);
            $publicUrl = $fileReference->getPublicUrl();
            if ($publicUrl === null || $publicUrl === '') {
                return null;
            }
            $siteUrl = GeneralUtility::getIndpEnv('TYPO3_SITE_URL') ?: '';
            return $siteUrl . ltrim($publicUrl, '/');
        } catch (ResourceDoesNotExistException|\Throwable $e) {
            return null;
        }
    }
}
