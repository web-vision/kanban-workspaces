<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\EventListener;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\CMS\Workspaces\Event\AfterDataGeneratedForWorkspaceEvent;
use TYPO3\CMS\Workspaces\Service\GridDataService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\EventListener\LastEditorListener;

final class LastEditorListenerTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    #[Test]
    public function userOfTheLatestChangeOfTheWorkspaceVersionIsAdded(): void
    {
        $users = $this->getConnectionPool()->getConnectionForTable('be_users');
        $users->insert('be_users', ['uid' => 2, 'username' => 'editor', 'realName' => 'Erika Editor']);
        $users->insert('be_users', ['uid' => 3, 'username' => 'reviewer', 'realName' => '']);
        $this->addHistory('tt_content', 11, 2, RecordHistoryStore::ACTION_ADD, 1700000100);
        $this->addHistory('tt_content', 11, 3, RecordHistoryStore::ACTION_MODIFY, 1700000200);
        // stage changes and publishing do not count as a change of the record
        $this->addHistory('tt_content', 11, 2, RecordHistoryStore::ACTION_STAGECHANGE, 1700000300);
        $this->addHistory('pages', 5, 2, RecordHistoryStore::ACTION_MODIFY, 1700000100);
        // same uid in another table
        $this->addHistory('pages', 11, 2, RecordHistoryStore::ACTION_MODIFY, 1700000400);

        $event = $this->buildEvent([
            ['table' => 'tt_content', 'uid' => 11],
            ['table' => 'pages', 'uid' => 5],
            ['table' => 'tt_content', 'uid' => 99],
        ]);
        $this->get(LastEditorListener::class)($event);

        $data = $event->getData();
        self::assertSame([3, 2, null], array_column($data, 'last_editor_uid'));
        self::assertSame(['reviewer', 'editor', null], array_column($data, 'last_editor_username'));
        self::assertSame(['', 'Erika Editor', null], array_column($data, 'last_editor_realname'));
        self::assertSame([null, null, null], array_column($data, 'last_editor_avatar_url'));
    }

    private function addHistory(string $table, int $uid, int $userId, int $action, int $timestamp): void
    {
        $this->getConnectionPool()->getConnectionForTable('sys_history')->insert('sys_history', [
            'tablename' => $table,
            'recuid' => $uid,
            'userid' => $userId,
            'actiontype' => $action,
            'tstamp' => $timestamp,
            'workspace' => 1,
            'history_data' => '{}',
        ]);
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
