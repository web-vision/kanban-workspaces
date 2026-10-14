<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Unit\Mention;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;
use WebVision\KanbanWorkspaces\Mention\CommentHtmlSanitizer;
use WebVision\KanbanWorkspaces\Mention\Dto\MentionReference;
use WebVision\KanbanWorkspaces\Mention\MentionParser;
use WebVision\KanbanWorkspaces\Mention\MentionResolver;
use WebVision\KanbanWorkspaces\Mention\WorkspaceMentionDirectory;

final class GroupMentionExpansionTest extends UnitTestCase
{
    #[Test]
    public function parserExtractsGroupMentions(): void
    {
        $parser = new MentionParser();
        $html = '<p>Ping <span class="mention" data-mention="@group:5">@Editors</span></p>';
        $mentions = $parser->parse($html);

        self::assertCount(1, $mentions);
        self::assertTrue($mentions[0]->isGroup());
        self::assertSame(5, $mentions[0]->uid);
    }

    #[Test]
    public function resolverExpandsGroupMentionsToMemberRecipients(): void
    {
        $directory = $this->createMock(WorkspaceMentionDirectory::class);
        $directory->expects(self::once())
            ->method('resolveMentionedUserIds')
            ->with(
                self::callback(static function (array $mentions): bool {
                    return count($mentions) === 1
                        && $mentions[0] instanceof MentionReference
                        && $mentions[0]->isGroup()
                        && $mentions[0]->uid === 5;
                }),
                1
            )
            ->willReturn([10, 11, 12]);
        $directory->method('getNotifiableRecipients')->willReturn([
            ['uid' => 10, 'email' => 'a@example.com', 'realName' => 'A', 'username' => 'a', 'lang' => 'default'],
            ['uid' => 11, 'email' => 'b@example.com', 'realName' => 'B', 'username' => 'b', 'lang' => 'default'],
            ['uid' => 12, 'email' => 'c@example.com', 'realName' => 'C', 'username' => 'c', 'lang' => 'default'],
        ]);

        $resolver = new MentionResolver(new MentionParser(), new CommentHtmlSanitizer(), $directory);
        $result = $resolver->resolveFromCommentHtml(
            '<p><span class="mention" data-mention="@group:5">@Editors</span></p>',
            1
        );

        self::assertSame([10, 11, 12], $result['userIds']);
        self::assertCount(3, $result['recipients']);
    }
}
