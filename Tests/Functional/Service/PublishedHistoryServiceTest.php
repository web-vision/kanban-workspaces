<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Service;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Service\PublishedHistoryService;

final class PublishedHistoryServiceTest extends FunctionalTestCase
{
    private const WORKSPACE_UID = 1;
    private const OTHER_WORKSPACE_UID = 2;

    protected array $coreExtensionsToLoad = [
        'typo3/cms-workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/publishedHistory.csv');
        $this->setUpUser(1, self::WORKSPACE_UID);
    }

    #[Test]
    public function newChangedAndDeletedRecordsAreListedNewestFirst(): void
    {
        $dataHandler = $this->runDataHandler(['tt_content' => ['NEW1' => ['pid' => 1, 'CType' => 'text', 'header' => 'New element']]]);
        $newUid = (int)$dataHandler->substNEWwithIDs['NEW1'];
        $this->publish('tt_content', $newUid);
        $this->runDataHandler(['tt_content' => [10 => ['header' => 'Changed element']]]);
        $this->publish('tt_content', 10);
        $this->runDataHandler([], ['tt_content' => [$newUid => ['delete' => 1]]]);
        $this->publish('tt_content', $newUid);

        $records = $this->findPublishedRecords();

        self::assertSame(
            [
                ['tt_content', $newUid, 'deleted'],
                ['tt_content', 10, 'modified'],
                ['tt_content', $newUid, 'new'],
            ],
            array_map(static fn (array $record): array => [$record['table'], $record['uid'], $record['action']], $records)
        );
        self::assertSame('Changed element', $records[1]['title']);
        self::assertSame('Root', $records[1]['pageTitle']);
        self::assertSame(1, $records[1]['pid']);
        self::assertSame('Admin User', $records[1]['publishedBy']);
        self::assertSame('publish test', $records[1]['comment']);
        self::assertStringContainsString('element=tt_content:10', $records[1]['historyUrl']);
    }

    #[Test]
    public function recordsPublishedFromAnotherWorkspaceAreNotListed(): void
    {
        $this->setUpUser(1, self::OTHER_WORKSPACE_UID);
        $this->runDataHandler(['tt_content' => [10 => ['header' => 'Changed in the other workspace']]]);
        $this->publish('tt_content', 10, self::OTHER_WORKSPACE_UID);
        $this->setUpUser(1, self::WORKSPACE_UID);

        self::assertSame([], $this->findPublishedRecords());
        self::assertCount(1, $this->findPublishedRecords(self::OTHER_WORKSPACE_UID));
    }

    #[Test]
    public function recordsPublishedBeforeTheGivenTimeAreNotListed(): void
    {
        $this->runDataHandler(['tt_content' => [10 => ['header' => 'Changed element']]]);
        $this->publish('tt_content', 10);
        $this->getConnectionPool()->getConnectionForTable('sys_history')
            ->update('sys_history', ['tstamp' => 1000], ['actiontype' => RecordHistoryStore::ACTION_PUBLISH]);

        self::assertSame([], $this->findPublishedRecords(since: 1001));
        self::assertCount(1, $this->findPublishedRecords(since: 1000));
    }

    #[Test]
    public function recordsOfHiddenTablesAreNotListed(): void
    {
        $this->addPublishEntry('sys_file_reference', 1);

        self::assertSame([], $this->findPublishedRecords());
    }

    #[Test]
    public function recordsOnPagesTheUserCannotReadAreNotListed(): void
    {
        $this->runDataHandler([
            'tt_content' => [
                10 => ['header' => 'Changed root element'],
                20 => ['header' => 'Changed editor element'],
            ],
        ]);
        $this->publish('tt_content', 10);
        $this->publish('tt_content', 20);
        $this->setUpUser(2, self::WORKSPACE_UID);

        $records = $this->findPublishedRecords();

        self::assertSame([20], array_column($records, 'uid'));
    }

    #[Test]
    public function onlyRecordsOnTheGivenPagesAreListed(): void
    {
        $this->runDataHandler([
            'tt_content' => [
                10 => ['header' => 'Changed root element'],
                20 => ['header' => 'Changed editor element'],
            ],
            'pages' => [2 => ['title' => 'Changed editor page']],
        ]);
        $this->publish('tt_content', 10);
        $this->publish('tt_content', 20);
        $this->publish('pages', 2);

        $records = $this->findPublishedRecords(pageIds: [2]);

        self::assertSame([['pages', 2], ['tt_content', 20]], array_map(static fn (array $record): array => [$record['table'], $record['uid']], $records));
        self::assertSame([], $this->findPublishedRecords(pageIds: []));
    }

    #[Test]
    public function pageTreeIdsContainThePageAndItsSubpagesDownToTheGivenDepth(): void
    {
        $service = new PublishedHistoryService($this->getConnectionPool(), $this->get(UriBuilder::class));

        self::assertSame([1], $service->getPageTreeIds(1, 0));
        self::assertSame([1, 2], $service->getPageTreeIds(1, 1));
        self::assertSame([1, 2], $service->getPageTreeIds(1, 999));
        self::assertSame([2], $service->getPageTreeIds(2, 999));
        self::assertSame([], $service->getPageTreeIds(0, 999));
    }

    private function setUpUser(int $uid, int $workspaceId): void
    {
        $backendUser = $this->setUpBackendUser($uid);
        $backendUser->setWorkspace($workspaceId);
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->createFromUserPreferences($backendUser);
    }

    /**
     * @param list<int>|null $pageIds
     * @return list<array<string, mixed>>
     */
    private function findPublishedRecords(int $workspaceId = self::WORKSPACE_UID, int $since = 0, ?array $pageIds = null): array
    {
        $service = new PublishedHistoryService($this->getConnectionPool(), $this->get(UriBuilder::class));
        return $service->findPublishedRecords($workspaceId, $since, PublishedHistoryService::DEFAULT_LIMIT, $pageIds);
    }

    private function publish(string $table, int $liveUid, int $workspaceId = self::WORKSPACE_UID): void
    {
        $version = BackendUtility::getWorkspaceVersionOfRecord($workspaceId, $table, $liveUid, 'uid');
        $this->runDataHandler([], [
            $table => [$liveUid => ['version' => ['action' => 'publish', 'swapWith' => (int)($version['uid'] ?? $liveUid), 'comment' => 'publish test']]],
        ]);
    }

    private function addPublishEntry(string $table, int $uid): void
    {
        $this->getConnectionPool()->getConnectionForTable('sys_history')->insert('sys_history', [
            'actiontype' => RecordHistoryStore::ACTION_PUBLISH,
            'usertype' => 'BE',
            'userid' => 1,
            'tablename' => $table,
            'recuid' => $uid,
            'tstamp' => time(),
            'history_data' => json_encode(['workspaceId' => self::WORKSPACE_UID, 'comment' => '', 'recipients' => []]),
            'workspace' => 0,
            'correlation_id' => '',
        ]);
    }

    /**
     * @param array<string, mixed> $data
     * @param array<string, mixed> $commands
     */
    private function runDataHandler(array $data, array $commands = []): DataHandler
    {
        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start($data, $commands);
        $dataHandler->process_datamap();
        $dataHandler->process_cmdmap();
        self::assertSame([], $dataHandler->errorLog);
        return $dataHandler;
    }
}
