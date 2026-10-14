<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Tca;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class ChecklistTcaTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
        'rte_ckeditor',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    #[Test]
    public function checklistTablesAreDefinedInTca(): void
    {
        self::assertArrayHasKey('tx_kanbanworkspaces_stage_checklist', $GLOBALS['TCA']);
        self::assertArrayHasKey('tx_kanbanworkspaces_checklist_state', $GLOBALS['TCA']);
        self::assertArrayNotHasKey('tx_kanbanworkspaces_checklist_history', $GLOBALS['TCA']);
    }

    #[Test]
    public function workspaceDefinesDefaultStageChecklistFields(): void
    {
        $columns = $GLOBALS['TCA']['sys_workspace']['columns'] ?? [];
        self::assertArrayHasKey('checklist_items_edit', $columns);
        self::assertArrayHasKey('checklist_items_publish', $columns);
        self::assertArrayHasKey('checklist_items_execute', $columns);
        self::assertSame(
            'tx_kanbanworkspaces_stage_checklist',
            $columns['checklist_items_edit']['config']['foreign_table'] ?? null
        );
    }

    #[Test]
    public function stageChecklistSupportsWorkspaceIdColumn(): void
    {
        $columns = array_keys($GLOBALS['TCA']['tx_kanbanworkspaces_stage_checklist']['columns'] ?? []);
        self::assertContains('stage', $columns);
        self::assertContains('workspace_id', $columns);
        self::assertContains('title', $columns);
    }
}
