<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class ExtensionLoadedTest extends FunctionalTestCase
{
    private const ALLOWED_MAJOR_VERSIONS = [13, 14];

    /**
     * @var string[]
     */
    protected array $coreExtensionsToLoad = [
        'typo3/cms-workspaces',
    ];

    /**
     * @var string[]
     */
    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    public static function loadedExtensionsDataSet(): \Generator
    {
        $packages = [
            'kanban_workspaces' => 'web-vision/kanban-workspaces',
        ];
        foreach ($packages as $extensionKey => $packageName) {
            yield 'EXT:' . $extensionKey => ['identifier' => $extensionKey];
            yield $packageName => ['identifier' => $packageName];
        }
    }

    #[DataProvider('loadedExtensionsDataSet')]
    #[Test]
    public function isLoadedExtensionKey(string $identifier): void
    {
        $this->assertTrue(ExtensionManagementUtility::isLoaded($identifier), $identifier);
    }

    #[Test]
    public function allowedMajorTypo3Version(): void
    {
        $this->assertContains((new Typo3Version())->getMajorVersion(), self::ALLOWED_MAJOR_VERSIONS);
    }

    #[Group('not-core-14')]
    #[Test]
    public function verifyCore13(): void
    {
        $this->assertSame(13, (new Typo3Version())->getMajorVersion());
    }

    #[Group('not-core-13')]
    #[Test]
    public function verifyCore14(): void
    {
        $this->assertSame(14, (new Typo3Version())->getMajorVersion());
    }
}
