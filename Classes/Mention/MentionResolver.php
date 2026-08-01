<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Mention;

use WebVision\KanbanWorkspaces\Mention\Dto\MentionReference;

/**
 * Orchestrates parse → resolve → recipient list for a comment body.
 */
final class MentionResolver
{
    public const MAX_RECIPIENTS = 50;

    public function __construct(
        private readonly MentionParser $parser,
        private readonly CommentHtmlSanitizer $sanitizer,
        private readonly WorkspaceMentionDirectory $directory,
    ) {
    }

    /**
     * @return array{
     *     html: string,
     *     mentions: list<MentionReference>,
     *     userIds: list<int>,
     *     recipients: list<array{uid: int, email: string, realName: string, username: string, lang: string}>
     * }
     */
    public function resolveFromCommentHtml(string $rawHtml, int $excludeUserId = 0): array
    {
        $html = $this->sanitizer->sanitize($rawHtml);
        $mentions = $this->parser->parse($html);
        $userIds = $this->directory->resolveMentionedUserIds($mentions, $excludeUserId);
        if (count($userIds) > self::MAX_RECIPIENTS) {
            $userIds = array_slice($userIds, 0, self::MAX_RECIPIENTS);
        }
        $recipients = $this->directory->getNotifiableRecipients($userIds);

        return [
            'html' => $html,
            'mentions' => $mentions,
            'userIds' => $userIds,
            'recipients' => $recipients,
        ];
    }
}
