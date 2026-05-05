<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Service;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Service\AssigneeMappingService;

final class AssigneeMappingServiceTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    private function getSubject(): AssigneeMappingService
    {
        return $this->get(AssigneeMappingService::class);
    }

    #[Test]
    public function findLatestAssigneeBeUserIdReturnsMostRecentMapping(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_workspaces_assignee.csv');
        self::assertSame(11, $this->getSubject()->findLatestAssigneeBeUserIdForRecord(1, 'tt_content', 42));
    }

    #[Test]
    public function findLatestAssigneeBeUserIdReturnsNullWhenNoMappingExists(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_workspaces_assignee.csv');
        self::assertNull($this->getSubject()->findLatestAssigneeBeUserIdForRecord(1, 'pages', 42));
    }

    #[Test]
    public function findLatestAssigneeBeUserIdIgnoresOtherWorkspaces(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_workspaces_assignee.csv');
        self::assertSame(12, $this->getSubject()->findLatestAssigneeBeUserIdForRecord(2, 'tt_content', 42));
    }

    #[Test]
    public function findLatestAssigneeBeUserIdIgnoresOtherRecords(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_workspaces_assignee.csv');
        self::assertSame(13, $this->getSubject()->findLatestAssigneeBeUserIdForRecord(1, 'tt_content', 99));
    }
}
