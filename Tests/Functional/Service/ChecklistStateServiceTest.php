<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Service;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Service\ChecklistStateService;

final class ChecklistStateServiceTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    private function getSubject(): ChecklistStateService
    {
        return $this->get(ChecklistStateService::class);
    }

    #[Test]
    public function saveStateSnapshotPersistsCheckedFlagsAndWritesActivity(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/be_users_admin.csv');
        $this->setUpBackendUser(1);

        $this->getSubject()->saveStateSnapshot(
            1,
            'tt_content',
            42,
            5,
            [
                ['id' => 1, 'checked' => true],
                ['id' => 2, 'checked' => false],
            ],
            1
        );

        $state = $this->getSubject()->getState(1, 'tt_content', 42, 5);
        self::assertTrue($state[1]);
        self::assertFalse($state[2]);

        $historyRows = $this->fetchSysHistory('tt_content', 42);
        self::assertCount(1, $historyRows);
        self::assertSame(RecordHistoryStore::ACTION_STAGECHANGE, (int)$historyRows[0]['actiontype']);
        $payload = json_decode((string)$historyRows[0]['history_data'], true);
        self::assertSame(5, (int)$payload['current']);
        self::assertSame(5, (int)$payload['next']);
        self::assertStringContainsString('Checked:', (string)$payload['comment']);
        self::assertStringContainsString('Unchecked:', (string)$payload['comment']);
    }

    #[Test]
    public function toggleItemUpdatesStateAndWritesActivity(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/be_users_admin.csv');
        $this->setUpBackendUser(1);

        $this->getSubject()->saveStateSnapshot(
            1,
            'tt_content',
            42,
            5,
            [['id' => 1, 'checked' => false]],
            1
        );
        $this->getSubject()->toggleItem(1, 'tt_content', 42, 5, 1, true, 1);

        $state = $this->getSubject()->getState(1, 'tt_content', 42, 5);
        self::assertTrue($state[1]);

        $historyRows = $this->fetchSysHistory('tt_content', 42);
        self::assertGreaterThanOrEqual(2, count($historyRows));
        self::assertSame(RecordHistoryStore::ACTION_STAGECHANGE, (int)$historyRows[0]['actiontype']);
        $latest = json_decode((string)$historyRows[0]['history_data'], true);
        self::assertSame('Checked: Custom QA passed', $latest['comment']);
    }

    #[Test]
    public function reEntryKeepsExistingStateAndDoesNotTouchOtherStages(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/be_users_admin.csv');
        $this->setUpBackendUser(1);

        $this->getSubject()->saveStateSnapshot(
            1,
            'tt_content',
            42,
            5,
            [['id' => 1, 'checked' => true]],
            1
        );
        $this->getSubject()->saveStateSnapshot(
            1,
            'tt_content',
            42,
            -10,
            [['id' => 4, 'checked' => true]],
            1
        );

        $this->getSubject()->saveStateSnapshot(
            1,
            'tt_content',
            42,
            5,
            [['id' => 1, 'checked' => true], ['id' => 2, 'checked' => true]],
            1
        );

        $stageFive = $this->getSubject()->getState(1, 'tt_content', 42, 5);
        $stageReady = $this->getSubject()->getState(1, 'tt_content', 42, -10);
        self::assertTrue($stageFive[1]);
        self::assertTrue($stageFive[2]);
        self::assertTrue($stageReady[4], 'Other stage marks must remain intact');
    }

    #[Test]
    public function getItemsWithStateMergesTemplatesAndStoredFlags(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/be_users_admin.csv');
        $this->setUpBackendUser(1);

        $this->getSubject()->saveStateSnapshot(
            1,
            'tt_content',
            42,
            5,
            [['id' => 1, 'checked' => true]],
            1
        );

        $items = $this->getSubject()->getItemsWithState(1, 'tt_content', 42, 5);
        self::assertCount(2, $items);
        self::assertTrue($items[0]['checked']);
        self::assertFalse($items[1]['checked']);
    }

    #[Test]
    public function invalidRecordParametersAreNoOp(): void
    {
        $this->getSubject()->saveStateSnapshot(1, '', 0, 5, [['id' => 1, 'checked' => true]], 1);
        $connection = $this->get(ConnectionPool::class)->getConnectionForTable('tx_kanbanworkspaces_checklist_state');
        $count = (int)$connection->count('*', 'tx_kanbanworkspaces_checklist_state', []);
        self::assertSame(0, $count);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fetchSysHistory(string $table, int $recordUid): array
    {
        $queryBuilder = $this->get(ConnectionPool::class)->getQueryBuilderForTable('sys_history');
        $queryBuilder->getRestrictions()->removeAll();
        return $queryBuilder
            ->select('*')
            ->from('sys_history')
            ->where(
                $queryBuilder->expr()->eq('tablename', $queryBuilder->createNamedParameter($table)),
                $queryBuilder->expr()->eq('recuid', $queryBuilder->createNamedParameter($recordUid, Connection::PARAM_INT)),
            )
            ->orderBy('uid', 'DESC')
            ->executeQuery()
            ->fetchAllAssociative();
    }
}
