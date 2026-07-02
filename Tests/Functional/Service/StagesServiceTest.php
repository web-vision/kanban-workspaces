<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Tests\Functional\Service;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Workspaces\Service\StagesService as CoreStagesService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Service\StagesService;

final class StagesServiceTest extends FunctionalTestCase
{
    /**
     * @var string[]
     */
    protected array $coreExtensionsToLoad = [
        'typo3/cms-workspaces',
    ];

    /**
     * @var string[]
     */
    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->create('default');
    }

    #[Test]
    public function coreStagesServiceIsReplacedByExtendedService(): void
    {
        self::assertInstanceOf(StagesService::class, $this->get(CoreStagesService::class));
    }

    #[Test]
    public function getStageTitleFallsBackToCoreTitleWhenConfigurationIsEmpty(): void
    {
        $stagesService = $this->get(CoreStagesService::class);

        self::assertSame('Editing', $stagesService->getStageTitle(CoreStagesService::STAGE_EDIT_ID));
        self::assertSame('Ready to publish', $stagesService->getStageTitle(CoreStagesService::STAGE_PUBLISH_ID));
        self::assertSame('Publish', $stagesService->getStageTitle(CoreStagesService::STAGE_PUBLISH_EXECUTE_ID));
    }

    #[Test]
    public function getStageTitleReturnsHardcodedCustomTitles(): void
    {
        $GLOBALS['TYPO3_CONF_VARS']['EXTENSIONS']['kanban_workspaces'] = [
            'customStageEditTitle' => 'In editing',
            'customStageReadyToPublishTitle' => 'In review',
            'customStagePublishTitle' => 'Go live',
        ];
        $stagesService = $this->get(CoreStagesService::class);

        self::assertSame('In editing', $stagesService->getStageTitle(CoreStagesService::STAGE_EDIT_ID));
        self::assertSame('In review', $stagesService->getStageTitle(CoreStagesService::STAGE_PUBLISH_ID));
        self::assertSame('Go live', $stagesService->getStageTitle(CoreStagesService::STAGE_PUBLISH_EXECUTE_ID));
    }

    #[Test]
    public function getStageTitleResolvesLllReferences(): void
    {
        $GLOBALS['TYPO3_CONF_VARS']['EXTENSIONS']['kanban_workspaces'] = [
            'customStageEditTitle' => 'LLL:EXT:workspaces/Resources/Private/Language/locallang_mod.xlf:stage_ready_to_publish',
        ];
        $stagesService = $this->get(CoreStagesService::class);

        self::assertSame('Ready to publish', $stagesService->getStageTitle(CoreStagesService::STAGE_EDIT_ID));
    }
}
