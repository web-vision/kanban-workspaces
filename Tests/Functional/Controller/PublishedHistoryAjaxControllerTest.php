<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Controller;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Context\Context;
use TYPO3\CMS\Core\Context\DateTimeAspect;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Controller\PublishedHistoryAjaxController;
use WebVision\KanbanWorkspaces\Service\PublishedHistoryService;

final class PublishedHistoryAjaxControllerTest extends FunctionalTestCase
{
    private const WORKSPACE_UID = 1;
    private const NOW = 1800000000;

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
        $backendUser = $this->setUpBackendUser(1);
        $backendUser->setWorkspace(self::WORKSPACE_UID);
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->createFromUserPreferences($backendUser);
        $this->get(Context::class)->setAspect('date', new DateTimeAspect(new \DateTimeImmutable('@' . self::NOW)));
    }

    /**
     * @return array<string, array{array<string, string>, int}>
     */
    public static function daysParameterDataProvider(): array
    {
        return [
            'missing' => [[], PublishedHistoryService::DEFAULT_MAX_AGE_DAYS],
            'no number' => [['days' => 'abc'], PublishedHistoryService::DEFAULT_MAX_AGE_DAYS],
            'given' => [['days' => '7'], 7],
            'below the minimum' => [['days' => '0'], 1],
            'above the maximum' => [['days' => '1000'], PublishedHistoryService::MAX_AGE_DAYS],
        ];
    }

    /**
     * @param array<string, string> $queryParams
     */
    #[Test]
    #[DataProvider('daysParameterDataProvider')]
    public function daysAreTakenFromTheQueryParameterWithinTheAllowedRange(array $queryParams, int $expectedDays): void
    {
        self::assertSame($expectedDays, $this->list($queryParams)['days']);
    }

    #[Test]
    public function onlyRecordsPublishedWithinTheGivenDaysAreListed(): void
    {
        $this->addPublishEntry(10, self::NOW - 2 * 86400);
        $this->addPublishEntry(20, self::NOW - 10 * 86400);

        self::assertSame([10], array_column($this->list(['days' => '5'])['records'], 'uid'));
        self::assertSame([10, 20], array_column($this->list(['days' => '15'])['records'], 'uid'));
    }

    /**
     * @param array<string, string> $queryParams
     * @return array{success: bool, days: int, records: list<array<string, mixed>>}
     */
    private function list(array $queryParams): array
    {
        $request = (new ServerRequest('https://localhost/typo3/ajax/kanban-workspace/published-history'))
            ->withQueryParams($queryParams);
        $response = $this->get(PublishedHistoryAjaxController::class)->listAction($request);
        return json_decode((string)$response->getBody(), true);
    }

    private function addPublishEntry(int $uid, int $timestamp): void
    {
        $this->getConnectionPool()->getConnectionForTable('sys_history')->insert('sys_history', [
            'actiontype' => RecordHistoryStore::ACTION_PUBLISH,
            'usertype' => 'BE',
            'userid' => 1,
            'tablename' => 'tt_content',
            'recuid' => $uid,
            'tstamp' => $timestamp,
            'history_data' => json_encode(['workspaceId' => self::WORKSPACE_UID, 'oldRecord' => [], 'comment' => '', 'recipients' => []]),
            'workspace' => 0,
            'correlation_id' => '',
        ]);
    }
}
