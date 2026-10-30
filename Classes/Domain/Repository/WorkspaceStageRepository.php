<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Domain\Repository;

use Symfony\Component\DependencyInjection\Attribute\AsAlias;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Workspaces\Domain\Model\Workspace;
use TYPO3\CMS\Workspaces\Domain\Model\WorkspaceStage;
use TYPO3\CMS\Workspaces\Domain\Repository\WorkspaceStageRepository as CoreWorkspaceStageRepository;
use TYPO3\CMS\Workspaces\Service\StagesService;
use TYPO3\CMS\Workspaces\Service\WorkspaceService;
use WebVision\KanbanWorkspaces\Configuration\EmConfiguration;

/**
 * Extends the core {@see CoreWorkspaceStageRepository} to optionally drop the
 * default "Ready to publish" stage (``StagesService::STAGE_PUBLISH_ID``), so the
 * workflow steps directly from "Editing" to "Publish". Enabled through the
 * ``hideReadyToPublishStage`` extension configuration option.
 *
 * The class replaces the core repository in the container via the `#[AsAlias]`
 * attribute, so every consumer (kanban board, core Workspaces module, preview
 * toolbar) receives the filtered stage list, and the core
 * `StagesService::getNextStage()` / `getPreviousStage()` then step directly
 * between the edit and the execute stage. Like {@see \WebVision\KanbanWorkspaces\Service\StagesService},
 * the constructor is intentionally *not* overridden, so the parent dependencies
 * keep being autowired, and {@see EmConfiguration} is fetched on demand.
 *
 * Workspaces with "Publish only content in publish stage"
 * (``sys_workspace.publish_access & PUBLISH_ACCESS_ONLY_IN_PUBLISH_STAGE``) keep
 * the stage: the core workflow requires it there (`GridDataService` looks it up
 * and would fail without it).
 *
 * Heads up: the parent class is marked `@internal`, so its signature may change
 * with TYPO3 updates.
 */
#[AsAlias(id: CoreWorkspaceStageRepository::class, public: true)]
final readonly class WorkspaceStageRepository extends CoreWorkspaceStageRepository
{
    /**
     * @return WorkspaceStage[]
     */
    public function findAllStagesByWorkspace(BackendUserAuthentication $backendUser, Workspace $workspaceRecord): array
    {
        $stages = parent::findAllStagesByWorkspace($backendUser, $workspaceRecord);

        if (!GeneralUtility::makeInstance(EmConfiguration::class)->getHideReadyToPublishStage()
            || $this->requiresReadyToPublishStage($workspaceRecord)
        ) {
            return $stages;
        }

        return array_values(array_filter(
            $stages,
            static fn (WorkspaceStage $stage): bool => $stage->uid !== StagesService::STAGE_PUBLISH_ID
        ));
    }

    /**
     * The Workspace model carries no publish_access property, so the raw record is read.
     */
    private function requiresReadyToPublishStage(Workspace $workspaceRecord): bool
    {
        $record = BackendUtility::getRecord('sys_workspace', $workspaceRecord->uid, 'publish_access');

        return ((int)($record['publish_access'] ?? 0) & WorkspaceService::PUBLISH_ACCESS_ONLY_IN_PUBLISH_STAGE) !== 0;
    }
}
