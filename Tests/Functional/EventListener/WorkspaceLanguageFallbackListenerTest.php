<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\EventListener;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Workspaces\Event\AfterCompiledCacheableDataForWorkspaceEvent;
use TYPO3\CMS\Workspaces\Service\GridDataService;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\EventListener\WorkspaceLanguageFallbackListener;

final class WorkspaceLanguageFallbackListenerTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    private function getSubject(): WorkspaceLanguageFallbackListener
    {
        return $this->get(WorkspaceLanguageFallbackListener::class);
    }

    /**
     * Build the event with a `GridDataService` instance constructed without
     * invoking its constructor. The listener never touches the service, the
     * reference only needs to satisfy the event's type hint.
     *
     * @param array<string, array<string, mixed>> $data
     */
    private function buildEvent(array $data): AfterCompiledCacheableDataForWorkspaceEvent
    {
        $gridService = (new \ReflectionClass(GridDataService::class))->newInstanceWithoutConstructor();
        return new AfterCompiledCacheableDataForWorkspaceEvent($gridService, $data, []);
    }

    #[Test]
    public function emptyTitleIsReplacedWithAll(): void
    {
        $event = $this->buildEvent([
            'tt_content:42' => [
                'id' => 'tt_content:42',
                'language' => [
                    'icon' => 'flags-multiple',
                    'title' => '',
                    'title_crop' => '',
                ],
            ],
        ]);
        $this->getSubject()->__invoke($event);
        $data = $event->getData();
        self::assertSame('all', $data['tt_content:42']['language']['title']);
        self::assertSame('all', $data['tt_content:42']['language']['title_crop']);
        self::assertSame('flags-multiple', $data['tt_content:42']['language']['icon']);
    }

    #[Test]
    public function nullTitleIsReplacedWithAll(): void
    {
        $event = $this->buildEvent([
            'tt_content:42' => [
                'id' => 'tt_content:42',
                'language' => [
                    'icon' => 'flags-multiple',
                    'title' => null,
                    'title_crop' => '',
                ],
            ],
        ]);
        $this->getSubject()->__invoke($event);
        $data = $event->getData();
        self::assertSame('all', $data['tt_content:42']['language']['title']);
        self::assertSame('all', $data['tt_content:42']['language']['title_crop']);
    }

    #[Test]
    public function missingTitleKeyTriggersFallback(): void
    {
        $event = $this->buildEvent([
            'tt_content:42' => [
                'id' => 'tt_content:42',
                'language' => [
                    'icon' => 'flags-multiple',
                ],
            ],
        ]);
        $this->getSubject()->__invoke($event);
        $data = $event->getData();
        self::assertSame('all', $data['tt_content:42']['language']['title']);
        self::assertSame('all', $data['tt_content:42']['language']['title_crop']);
    }

    #[Test]
    public function populatedTitleIsLeftUntouched(): void
    {
        $event = $this->buildEvent([
            'tt_content:42' => [
                'id' => 'tt_content:42',
                'language' => [
                    'icon' => 'flags-en',
                    'title' => 'English',
                    'title_crop' => 'English',
                ],
            ],
        ]);
        $this->getSubject()->__invoke($event);
        $data = $event->getData();
        self::assertSame('English', $data['tt_content:42']['language']['title']);
        self::assertSame('English', $data['tt_content:42']['language']['title_crop']);
    }

    #[Test]
    public function mixedEntriesOnlyRewriteTheEmptyOnes(): void
    {
        $event = $this->buildEvent([
            'tt_content:1' => [
                'id' => 'tt_content:1',
                'language' => [
                    'icon' => 'flags-en',
                    'title' => 'English',
                    'title_crop' => 'English',
                ],
            ],
            'tt_content:2' => [
                'id' => 'tt_content:2',
                'language' => [
                    'icon' => 'flags-multiple',
                    'title' => '',
                    'title_crop' => '',
                ],
            ],
        ]);
        $this->getSubject()->__invoke($event);
        $data = $event->getData();
        self::assertSame('English', $data['tt_content:1']['language']['title']);
        self::assertSame('English', $data['tt_content:1']['language']['title_crop']);
        self::assertSame('all', $data['tt_content:2']['language']['title']);
        self::assertSame('all', $data['tt_content:2']['language']['title_crop']);
    }

    #[Test]
    public function entriesWithoutLanguageKeyAreLeftUntouched(): void
    {
        $original = [
            'tt_content:1' => [
                'id' => 'tt_content:1',
                'label_Workspace' => 'foo',
            ],
        ];
        $event = $this->buildEvent($original);
        $this->getSubject()->__invoke($event);
        self::assertSame($original, $event->getData());
    }

    #[Test]
    public function emptyDataSetIsReturnedUnchanged(): void
    {
        $event = $this->buildEvent([]);
        $this->getSubject()->__invoke($event);
        self::assertSame([], $event->getData());
    }
}
