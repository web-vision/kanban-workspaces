<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Tests\Functional\Domain\Repository;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Workspaces\Domain\Model\WorkspaceStage;
use TYPO3\CMS\Workspaces\Domain\Repository\WorkspaceRepository;
use TYPO3\CMS\Workspaces\Domain\Repository\WorkspaceStageRepository as CoreWorkspaceStageRepository;
use TYPO3\CMS\Workspaces\Service\StagesService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Domain\Repository\WorkspaceStageRepository;

final class WorkspaceStageRepositoryTest extends FunctionalTestCase
{
    private const TWO_STAGE_WORKSPACE_UID = 1;
    private const PUBLISH_STAGE_WORKSPACE_UID = 2;

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
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/readyToPublishStage.csv');
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->create('default');
    }

    #[Test]
    public function coreWorkspaceStageRepositoryIsReplacedByExtendedRepository(): void
    {
        self::assertInstanceOf(WorkspaceStageRepository::class, $this->get(CoreWorkspaceStageRepository::class));
    }

    #[Test]
    public function readyToPublishStageIsKeptByDefault(): void
    {
        self::assertSame(
            [StagesService::STAGE_EDIT_ID, StagesService::STAGE_PUBLISH_ID, StagesService::STAGE_PUBLISH_EXECUTE_ID],
            $this->findStageUids(self::TWO_STAGE_WORKSPACE_UID)
        );
    }

    #[Test]
    public function readyToPublishStageIsHiddenWhenConfigured(): void
    {
        $GLOBALS['TYPO3_CONF_VARS']['EXTENSIONS']['kanban_workspaces'] = ['hideReadyToPublishStage' => '1'];

        self::assertSame(
            [StagesService::STAGE_EDIT_ID, StagesService::STAGE_PUBLISH_EXECUTE_ID],
            $this->findStageUids(self::TWO_STAGE_WORKSPACE_UID)
        );
    }

    #[Test]
    public function readyToPublishStageIsKeptForWorkspacesPublishingOnlyFromThatStage(): void
    {
        $GLOBALS['TYPO3_CONF_VARS']['EXTENSIONS']['kanban_workspaces'] = ['hideReadyToPublishStage' => '1'];

        self::assertSame(
            [StagesService::STAGE_EDIT_ID, StagesService::STAGE_PUBLISH_ID, StagesService::STAGE_PUBLISH_EXECUTE_ID],
            $this->findStageUids(self::PUBLISH_STAGE_WORKSPACE_UID)
        );
    }

    /**
     * @return list<int>
     */
    private function findStageUids(int $workspaceUid): array
    {
        $backendUser = $this->setUpBackendUser(1);
        $workspace = $this->get(WorkspaceRepository::class)->findByUid($workspaceUid);
        $stages = $this->get(CoreWorkspaceStageRepository::class)->findAllStagesByWorkspace($backendUser, $workspace);

        return array_map(static fn (WorkspaceStage $stage): int => $stage->uid, $stages);
    }
}
