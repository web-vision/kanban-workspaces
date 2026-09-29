<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Notification;

use WebVision\KanbanWorkspaces\Mention\MentionResolver;

/**
 * Facade used by AJAX controllers to notify mentioned users from comment HTML.
 */
final class MentionNotificationService
{
    public function __construct(
        private readonly MentionResolver $mentionResolver,
        private readonly MentionNotifierInterface $mentionNotifier,
    ) {
    }

    /**
     * @return array{notified: int, userIds: list<int>, html: string}
     */
    public function notifyFromComment(
        string $rawCommentHtml,
        string $tableName,
        int $recordUid,
        int $workspaceId,
        int $stageId,
        int $authorUserId,
    ): array {
        $resolved = $this->mentionResolver->resolveFromCommentHtml($rawCommentHtml, $authorUserId);
        $this->mentionNotifier->notify($resolved['recipients'], [
            'commentHtml' => $resolved['html'],
            'tableName' => $tableName,
            'recordUid' => $recordUid,
            'workspaceId' => $workspaceId,
            'stageId' => $stageId,
        ]);

        return [
            'notified' => count($resolved['recipients']),
            'userIds' => $resolved['userIds'],
            'html' => $resolved['html'],
        ];
    }
}
