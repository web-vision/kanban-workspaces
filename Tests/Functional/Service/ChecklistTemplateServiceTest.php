<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Service;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Service\ChecklistTemplateService;

final class ChecklistTemplateServiceTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
        'rte_ckeditor',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    private function getSubject(): ChecklistTemplateService
    {
        return $this->get(ChecklistTemplateService::class);
    }

    #[Test]
    public function getChecklistForCustomStageReturnsItems(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');
        $items = $this->getSubject()->getChecklistForStage(5);

        self::assertCount(2, $items);
        self::assertSame(1, $items[0]['id']);
        self::assertSame('Custom QA passed', $items[0]['title']);
        self::assertSame('Custom Docs updated', $items[1]['title']);
    }

    #[Test]
    public function getChecklistForDefaultStageRequiresWorkspace(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');

        self::assertSame([], $this->getSubject()->getChecklistForStage(0));
        $items = $this->getSubject()->getChecklistForStage(0, 1);
        self::assertCount(1, $items);
        self::assertSame('Editing: content review', $items[0]['title']);
    }

    #[Test]
    public function getChecklistForDefaultStageIgnoresOtherWorkspaces(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');
        $items = $this->getSubject()->getChecklistForStage(0, 2);

        self::assertCount(1, $items);
        self::assertSame('Other workspace editing item', $items[0]['title']);
    }

    #[Test]
    public function getChecklistForReadyToPublishStage(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');
        $items = $this->getSubject()->getChecklistForStage(-10, 1);

        self::assertCount(1, $items);
        self::assertSame('Ready: stakeholder OK', $items[0]['title']);
    }
}
