<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Service;

use Symfony\Component\DependencyInjection\Attribute\AsAlias;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Workspaces\Service\StagesService as CoreStagesService;
use WebVision\KanbanWorkspaces\Configuration\EmConfiguration;

/**
 * Extends the core workspaces {@see CoreStagesService} to allow overriding the
 * titles of the default TYPO3 workspace stages (Editing, Ready to publish,
 * Publish) through extension configuration.
 *
 * The class replaces the core service in the container via the `#[AsAlias]`
 * attribute, so every consumer (and `GeneralUtility::makeInstance()`) receives
 * this implementation. The constructor is intentionally *not* overridden, so the
 * parent dependencies keep being autowired through the inherited constructor.
 * The {@see EmConfiguration} value object is fetched on demand via
 * `GeneralUtility::makeInstance()` (it is a public service) to avoid adding a
 * mutable dependency to this otherwise readonly service.
 */
#[AsAlias(id: CoreStagesService::class, public: true)]
final readonly class StagesService extends CoreStagesService
{
    public function getStageTitle(int $stageId): string
    {
        $emConfiguration = GeneralUtility::makeInstance(EmConfiguration::class);
        $customTitle = match ($stageId) {
            self::STAGE_PUBLISH_EXECUTE_ID => $emConfiguration->getCustomStagePublishTitle(),
            self::STAGE_PUBLISH_ID => $emConfiguration->getCustomStageReadyToPublishTitle(),
            self::STAGE_EDIT_ID => $emConfiguration->getCustomStageEditTitle(),
            default => '',
        };

        if ($customTitle === '') {
            return parent::getStageTitle($stageId);
        }

        if (str_starts_with($customTitle, 'LLL:')) {
            return $this->getLanguageService()->sL($customTitle);
        }

        return $customTitle;
    }
}
