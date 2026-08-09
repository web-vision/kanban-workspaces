<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Unit\Mention;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;
use WebVision\KanbanWorkspaces\Mention\Dto\MentionReference;
use WebVision\KanbanWorkspaces\Mention\MentionParser;

final class MentionParserTest extends UnitTestCase
{
    private MentionParser $subject;

    protected function setUp(): void
    {
        parent::setUp();
        $this->subject = new MentionParser();
    }

    #[Test]
    public function parseExtractsUserAndGroupMentions(): void
    {
        $html = '<p>Hello <span class="mention" data-mention="@user:12">@jane.doe</span> '
            . 'and <span class="mention" data-mention="@group:5">@Editors</span></p>';

        $mentions = $this->subject->parse($html);

        self::assertCount(2, $mentions);
        self::assertTrue($mentions[0]->isUser());
        self::assertSame(12, $mentions[0]->uid);
        self::assertSame('jane.doe', $mentions[0]->label);
        self::assertTrue($mentions[1]->isGroup());
        self::assertSame(5, $mentions[1]->uid);
    }

    #[Test]
    public function parseDeduplicatesSameMention(): void
    {
        $html = '<p><span class="mention" data-mention="@user:3">@a</span> '
            . '<span class="mention" data-mention="@user:3">@a</span></p>';

        self::assertCount(1, $this->subject->parse($html));
    }

    #[Test]
    public function parseIgnoresInvalidMentionIds(): void
    {
        $html = '<p><span data-mention="@evil">x</span>'
            . '<span data-mention="@user:abc">y</span>'
            . '<span data-mention="user:1">z</span></p>';

        self::assertSame([], $this->subject->parse($html));
    }

    #[Test]
    public function parseReturnsEmptyForPlainText(): void
    {
        self::assertSame([], $this->subject->parse('Just a plain comment'));
    }

    #[Test]
    #[DataProvider('emptyProvider')]
    public function parseReturnsEmptyForBlankInput(string $input): void
    {
        self::assertSame([], $this->subject->parse($input));
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function emptyProvider(): array
    {
        return [
            'empty' => [''],
            'whitespace' => ["  \n  "],
        ];
    }

    #[Test]
    public function parseAcceptsMentionReferenceTypes(): void
    {
        $html = '<span class="mention" data-mention="@user:1">@admin</span>';
        $mention = $this->subject->parse($html)[0];
        self::assertSame(MentionReference::TYPE_USER, $mention->type);
        self::assertSame('@user:1', $mention->rawId);
    }
}
