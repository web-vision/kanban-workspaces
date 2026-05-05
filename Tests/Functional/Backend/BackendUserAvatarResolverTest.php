<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Backend;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Backend\BackendUserAvatarResolver;

final class BackendUserAvatarResolverTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    private function getSubject(): BackendUserAvatarResolver
    {
        return $this->get(BackendUserAvatarResolver::class);
    }

    #[Test]
    public function resolveAvatarUrlReturnsNullWhenNoReferenceExists(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_file_reference.csv');
        // uid 99 has no sys_file_reference row at all.
        self::assertNull($this->getSubject()->resolveAvatarUrl(99));
    }

    #[Test]
    public function resolveAvatarUrlReturnsNullForSoftDeletedReference(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_file_reference.csv');
        // be_users uid 43 has only a deleted=1 reference.
        self::assertNull($this->getSubject()->resolveAvatarUrl(43));
    }

    #[Test]
    public function resolveAvatarUrlReturnsNullWhenReferenceBelongsToDifferentTable(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_file_reference.csv');
        // uid 44 has a reference but for table tt_content, not be_users.
        self::assertNull($this->getSubject()->resolveAvatarUrl(44));
    }

    #[Test]
    public function resolveAvatarUrlReturnsNullWhenReferenceBelongsToDifferentField(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_file_reference.csv');
        // uid 45 has a be_users reference, but for the field "image", not "avatar".
        self::assertNull($this->getSubject()->resolveAvatarUrl(45));
    }

    #[Test]
    public function resolveAvatarUrlReturnsNullWhenFalResolutionFails(): void
    {
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/sys_file_reference.csv');
        // uid 42 has a non-deleted reference, but no sys_file/sys_file_storage rows or
        // physical file are set up, so FAL resolution must fail and the resolver must
        // swallow the exception and return null. This exercises the QueryBuilder match
        // path together with the catch-all guard.
        self::assertNull($this->getSubject()->resolveAvatarUrl(42));
    }
}
