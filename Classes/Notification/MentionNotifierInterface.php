<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Notification;

/**
 * Channel for delivering mention notifications (email in v1; extensible later).
 */
interface MentionNotifierInterface
{
    /**
     * @param list<array{uid: int, email: string, realName: string, username: string, lang: string}> $recipients
     * @param array{
     *     commentHtml: string,
     *     tableName: string,
     *     recordUid: int,
     *     workspaceId: int,
     *     stageId: int,
     *     recordTitle?: string
     * } $context
     */
    public function notify(array $recipients, array $context): void;
}
