<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Tca;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

/**
 * Regression coverage for T3C-271.
 *
 * The extension adds a t3ver_assignee select column (foreign_table
 * sys_workspaces_assignee) to all workspace-aware tables. When
 * sys_workspaces_assignee only existed in ext_tables.sql but not in TCA, the
 * FormEngine bailed out with "table is not defined in TCA" (#1439569743) as soon
 * as such a record was rendered. The table therefore needs a real TCA definition.
 */
final class SysWorkspacesAssigneeTcaTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    #[Test]
    public function assigneeTableIsDefinedInTca(): void
    {
        self::assertArrayHasKey('sys_workspaces_assignee', $GLOBALS['TCA']);
    }

    #[Test]
    public function assigneeTableDefinesAllBusinessColumns(): void
    {
        $columns = array_keys($GLOBALS['TCA']['sys_workspaces_assignee']['columns'] ?? []);
        foreach (['title', 'description', 'be_user', 'table_name', 'record_uid', 'workspace_id', 'stage_id'] as $expectedColumn) {
            self::assertContains($expectedColumn, $columns, $expectedColumn);
        }
    }

    #[Test]
    public function pagesT3verAssigneeReferencesAssigneeTable(): void
    {
        // This is the exact relation that triggered #1439569743 in the issue report.
        self::assertSame(
            'sys_workspaces_assignee',
            $GLOBALS['TCA']['pages']['columns']['t3ver_assignee']['config']['foreign_table'] ?? null
        );
    }

    #[Test]
    public function everyT3verAssigneeForeignTableIsDefinedInTca(): void
    {
        $checkedAtLeastOneTable = false;
        foreach ($GLOBALS['TCA'] as $table => $tableConfiguration) {
            $foreignTable = $tableConfiguration['columns']['t3ver_assignee']['config']['foreign_table'] ?? null;
            if ($foreignTable === null) {
                continue;
            }
            $checkedAtLeastOneTable = true;
            self::assertArrayHasKey(
                $foreignTable,
                $GLOBALS['TCA'],
                $table . '.t3ver_assignee references undefined TCA table ' . $foreignTable
            );
        }
        self::assertTrue($checkedAtLeastOneTable, 'No table with a t3ver_assignee column was found.');
    }
}
