<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Tests\Functional\Upgrades;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Configuration\EmConfiguration;
use WebVision\KanbanWorkspaces\Upgrades\ReadyToPublishStageUpgradeWizard;

final class ReadyToPublishStageUpgradeWizardTest extends FunctionalTestCase
{
    /**
     * @var string[]
     */
    protected array $coreExtensionsToLoad = [
        'typo3/cms-install',
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
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/readyToPublishStage.csv');
    }

    #[Test]
    public function updateIsNotNecessaryWhileTheStageIsShown(): void
    {
        self::assertFalse($this->createWizard(false)->updateNecessary());
    }

    #[Test]
    public function versionsInTheReadyToPublishStageAreMovedToTheEditStage(): void
    {
        $wizard = $this->createWizard(true);

        self::assertTrue($wizard->updateNecessary());
        self::assertTrue($wizard->executeUpdate());
        self::assertFalse($wizard->updateNecessary());

        self::assertSame(0, $this->getStage('pages', 2));
        self::assertSame(0, $this->getStage('tt_content', 11));
    }

    #[Test]
    public function otherRecordsAreLeftUntouched(): void
    {
        $this->createWizard(true)->executeUpdate();

        self::assertSame(-10, $this->getStage('pages', 3), 'workspace publishing only from the "Ready to publish" stage');
        self::assertSame(-20, $this->getStage('pages', 4), 'version in another stage');
        self::assertSame(-10, $this->getStage('tt_content', 10), 'live record');
    }

    private function createWizard(bool $hideReadyToPublishStage): ReadyToPublishStageUpgradeWizard
    {
        return new ReadyToPublishStageUpgradeWizard(
            $this->get(ConnectionPool::class),
            new EmConfiguration(hideReadyToPublishStage: $hideReadyToPublishStage),
        );
    }

    private function getStage(string $table, int $uid): int
    {
        return (int)(BackendUtility::getRecord($table, $uid, 't3ver_stage', '', false)['t3ver_stage'] ?? 0);
    }
}
