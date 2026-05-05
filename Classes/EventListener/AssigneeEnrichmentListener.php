<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\EventListener;

use Doctrine\DBAL\ParameterType;
use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Resource\ResourceFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent;
use WebVision\KanbanWorkspaces\Service\AssigneeMappingService;

/**
 * Enriches workspace data with assignee from sys_workspaces_assignee so cards can display assignee.
 * Includes assignee avatar URL from be_users.avatar (FAL) when available.
 */
final class AssigneeEnrichmentListener
{
    public function __construct(
        private readonly ConnectionPool $connectionPool,
        private readonly ResourceFactory $resourceFactory,
        private readonly AssigneeMappingService $assigneeMappingService,
    ) {
    }

    #[AsEventListener(
        identifier: 'kanban-workspaces/assignee-enrichment',
        after: 'kanban-workspaces/after-data-generated-for-workspace',
    )]
    public function __invoke(AfterDataGeneratedForWorkspaceEvent $event): void
    {
        $data = $event->getData();
        if ($data === []) {
            return;
        }

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
            $beUserId = $this->assigneeMappingService->findLatestAssigneeBeUserIdForRecord($workspaceId, $tableName, $uid);
            if ($beUserId !== null) {
                $item['assignee_uid'] = $beUserId;
                $beUsersQueryBuilder = $this->connectionPool->getQueryBuilderForTable('be_users');
                $userRow = $beUsersQueryBuilder
                    ->select('username')
                    ->from('be_users')
                    ->where(
                        $beUsersQueryBuilder->expr()->eq(
                            'uid',
                            $beUsersQueryBuilder->createNamedParameter($beUserId, ParameterType::INTEGER)
                        )
                    )
                    ->setMaxResults(1)
                    ->executeQuery()
                    ->fetchAssociative();
                if ($userRow !== false && isset($userRow['username'])) {
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
            $refRow = $this->connectionPool->getConnectionForTable('sys_file_reference')->executeQuery(
                'SELECT uid FROM sys_file_reference WHERE uid_foreign = ? AND tablenames = ? AND fieldname = ? AND deleted = 0 LIMIT 1',
                [$beUserId, 'be_users', 'avatar'],
                ['integer', 'string', 'string']
            )->fetchAssociative();
            if (!$refRow || empty($refRow['uid'])) {
                return null;
            }
            $fileReference = $this->resourceFactory->getFileReferenceObject((int)$refRow['uid']);
            $publicUrl = $fileReference->getPublicUrl();
            if ($publicUrl === null) {
                return null;
            }
            $siteUrl = GeneralUtility::getIndpEnv('TYPO3_SITE_URL') ?: '';
            return $siteUrl . ltrim($publicUrl, '/');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
