<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Upgrades;

use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\QueryBuilder;
use TYPO3\CMS\Install\Attribute\UpgradeWizard;
use TYPO3\CMS\Install\Updates\UpgradeWizardInterface;
use TYPO3\CMS\Workspaces\Service\StagesService;
use TYPO3\CMS\Workspaces\Service\WorkspaceService;
use WebVision\KanbanWorkspaces\Configuration\EmConfiguration;

/**
 * With ``hideReadyToPublishStage`` enabled, the "Ready to publish" stage (-10) is
 * dropped by {@see \WebVision\KanbanWorkspaces\Domain\Repository\WorkspaceStageRepository}.
 * Workspace versions still sitting in that stage would no longer show up in any
 * kanban column, so they are moved back to the edit stage (0).
 *
 * Workspaces with "Publish only content in publish stage" keep the stage (see the
 * repository's guard), so their records are left untouched.
 */
#[UpgradeWizard('kanbanWorkspaces_readyToPublishStage')]
final readonly class ReadyToPublishStageUpgradeWizard implements UpgradeWizardInterface
{
    public function __construct(
        private ConnectionPool $connectionPool,
        private EmConfiguration $emConfiguration,
    ) {
    }

    public function getTitle(): string
    {
        return 'Kanban Workspaces: Move workspace records out of the "Ready to publish" stage';
    }

    public function getDescription(): string
    {
        return 'Sets t3ver_stage from -10 ("Ready to publish") to 0 ("Editing") for all workspace versions, '
            . 'because the "Ready to publish" stage is hidden (extension configuration "hideReadyToPublishStage").';
    }

    public function executeUpdate(): bool
    {
        $excludedWorkspaces = $this->getWorkspacesRequiringReadyToPublishStage();
        foreach ($this->getVersionedTables() as $table) {
            $queryBuilder = $this->createQueryBuilder($table);
            $queryBuilder
                ->update($table)
                ->set('t3ver_stage', StagesService::STAGE_EDIT_ID)
                ->where(...$this->getConstraints($queryBuilder, $excludedWorkspaces))
                ->executeStatement();
        }

        return true;
    }

    public function updateNecessary(): bool
    {
        if (!$this->emConfiguration->getHideReadyToPublishStage()) {
            return false;
        }

        $excludedWorkspaces = $this->getWorkspacesRequiringReadyToPublishStage();
        foreach ($this->getVersionedTables() as $table) {
            $queryBuilder = $this->createQueryBuilder($table);
            $count = (int)$queryBuilder
                ->count('uid')
                ->from($table)
                ->where(...$this->getConstraints($queryBuilder, $excludedWorkspaces))
                ->executeQuery()
                ->fetchOne();
            if ($count > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return string[]
     */
    public function getPrerequisites(): array
    {
        return [];
    }

    /**
     * @return list<string>
     */
    private function getVersionedTables(): array
    {
        $tables = [];
        foreach ($GLOBALS['TCA'] as $table => $configuration) {
            if (!empty($configuration['ctrl']['versioningWS'])) {
                $tables[] = (string)$table;
            }
        }

        return $tables;
    }

    /**
     * @param list<int> $excludedWorkspaces
     * @return list<string>
     */
    private function getConstraints(QueryBuilder $queryBuilder, array $excludedWorkspaces): array
    {
        $constraints = [
            $queryBuilder->expr()->eq(
                't3ver_stage',
                $queryBuilder->createNamedParameter(StagesService::STAGE_PUBLISH_ID, Connection::PARAM_INT)
            ),
            $queryBuilder->expr()->gt('t3ver_wsid', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT)),
        ];
        if ($excludedWorkspaces !== []) {
            $constraints[] = $queryBuilder->expr()->notIn(
                't3ver_wsid',
                $queryBuilder->createNamedParameter($excludedWorkspaces, Connection::PARAM_INT_ARRAY)
            );
        }

        return $constraints;
    }

    /**
     * Workspaces with "Publish only content in publish stage" still use stage -10.
     *
     * @return list<int>
     */
    private function getWorkspacesRequiringReadyToPublishStage(): array
    {
        $queryBuilder = $this->createQueryBuilder('sys_workspace');
        $rows = $queryBuilder
            ->select('uid', 'publish_access')
            ->from('sys_workspace')
            ->executeQuery()
            ->fetchAllAssociative();

        $uids = [];
        foreach ($rows as $row) {
            if (((int)$row['publish_access'] & WorkspaceService::PUBLISH_ACCESS_ONLY_IN_PUBLISH_STAGE) !== 0) {
                $uids[] = (int)$row['uid'];
            }
        }

        return $uids;
    }

    private function createQueryBuilder(string $table): QueryBuilder
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable($table);
        $queryBuilder->getRestrictions()->removeAll();

        return $queryBuilder;
    }
}
