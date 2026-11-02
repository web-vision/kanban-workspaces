<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\EventListener;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent;
use TYPO3\CMS\Workspaces\Service\GridDataService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\EventListener\LastChangedTimestampListener;

final class LastChangedTimestampListenerTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    #[Test]
    public function timestampOfTheWorkspaceVersionIsAdded(): void
    {
        $connection = $this->getConnectionPool()->getConnectionForTable('tt_content');
        $connection->insert('tt_content', ['uid' => 11, 'pid' => 1, 'tstamp' => 1700000100, 't3ver_wsid' => 1, 't3ver_oid' => 10]);
        $connection->insert('tt_content', ['uid' => 21, 'pid' => 1, 'tstamp' => 1700000200, 't3ver_wsid' => 1, 't3ver_oid' => 20]);
        $this->getConnectionPool()->getConnectionForTable('pages')
            ->insert('pages', ['uid' => 5, 'pid' => 0, 'tstamp' => 1700000300, 't3ver_wsid' => 1]);

        $event = $this->buildEvent([
            ['table' => 'tt_content', 'uid' => 11],
            ['table' => 'pages', 'uid' => 5],
            ['table' => 'tt_content', 'uid' => 21],
            ['table' => 'tt_content', 'uid' => 99],
        ]);
        (new LastChangedTimestampListener($this->getConnectionPool()))($event);

        self::assertSame([1700000100, 1700000300, 1700000200, 0], array_column($event->getData(), 'lastChanged'));
    }

    /**
     * The listener does not use the GridDataService, it only satisfies the type hint of the event.
     *
     * @param list<array<string, mixed>> $data
     */
    private function buildEvent(array $data): AfterDataGeneratedForWorkspaceEvent
    {
        $gridService = (new \ReflectionClass(GridDataService::class))->newInstanceWithoutConstructor();
        return new AfterDataGeneratedForWorkspaceEvent($gridService, $data, []);
    }
}
