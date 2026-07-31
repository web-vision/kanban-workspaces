<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Unit\Mention;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;
use WebVision\KanbanWorkspaces\Mention\CommentHtmlSanitizer;

final class CommentHtmlSanitizerTest extends UnitTestCase
{
    private CommentHtmlSanitizer $subject;

    protected function setUp(): void
    {
        parent::setUp();
        $this->subject = new CommentHtmlSanitizer();
    }

    #[Test]
    public function sanitizeKeepsMentionSpans(): void
    {
        $html = '<p>Hi <span class="mention" data-mention="@user:2">@bob</span></p>';
        $result = $this->subject->sanitize($html);

        self::assertStringContainsString('data-mention="@user:2"', $result);
        self::assertStringContainsString('class="mention"', $result);
        self::assertStringContainsString('@bob', $result);
    }

    #[Test]
    public function sanitizeStripsScriptAndEventHandlers(): void
    {
        $html = '<p onclick="alert(1)">Safe</p><script>alert(2)</script>';
        $result = $this->subject->sanitize($html);

        self::assertStringNotContainsString('<script', strtolower($result));
        self::assertStringNotContainsString('onclick', strtolower($result));
        self::assertStringContainsString('Safe', $result);
    }

    #[Test]
    public function sanitizeRemovesInvalidMentionAttribute(): void
    {
        $html = '<span class="mention" data-mention="@evil">@x</span>';
        $result = $this->subject->sanitize($html);

        self::assertStringNotContainsString('data-mention="@evil"', $result);
    }

    #[Test]
    public function sanitizeWrapsPlainText(): void
    {
        $result = $this->subject->sanitize('Hello world & friends');
        self::assertStringContainsString('Hello world &amp; friends', $result);
        self::assertStringStartsWith('<p>', $result);
    }

    #[Test]
    public function sanitizeBlocksJavascriptHref(): void
    {
        $html = '<p><a href="javascript:alert(1)">click</a></p>';
        $result = $this->subject->sanitize($html);
        self::assertStringNotContainsString('javascript:', strtolower($result));
    }
}
