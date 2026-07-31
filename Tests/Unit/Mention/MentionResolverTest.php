<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Unit\Mention;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;
use WebVision\KanbanWorkspaces\Mention\CommentHtmlSanitizer;
use WebVision\KanbanWorkspaces\Mention\MentionParser;
use WebVision\KanbanWorkspaces\Mention\MentionResolver;
use WebVision\KanbanWorkspaces\Mention\WorkspaceMentionDirectory;

final class MentionResolverTest extends UnitTestCase
{
    #[Test]
    public function resolveFromCommentHtmlSanitizesAndParses(): void
    {
        $directory = $this->createMock(WorkspaceMentionDirectory::class);
        $directory->method('resolveMentionedUserIds')->willReturn([2, 3]);
        $directory->method('getNotifiableRecipients')->willReturn([
            [
                'uid' => 2,
                'email' => 'a@example.com',
                'realName' => 'A',
                'username' => 'a',
                'lang' => 'default',
            ],
        ]);

        $resolver = new MentionResolver(new MentionParser(), new CommentHtmlSanitizer(), $directory);
        $html = '<p>Hi <span class="mention" data-mention="@user:2">@a</span><script>x</script></p>';
        $result = $resolver->resolveFromCommentHtml($html, 1);

        self::assertStringContainsString('data-mention="@user:2"', $result['html']);
        self::assertStringNotContainsString('<script', $result['html']);
        self::assertCount(1, $result['mentions']);
        self::assertSame([2, 3], $result['userIds']);
        self::assertCount(1, $result['recipients']);
    }
}
