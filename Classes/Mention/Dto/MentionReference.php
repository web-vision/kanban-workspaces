<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Mention\Dto;

/**
 * A single mention extracted from comment HTML.
 */
final readonly class MentionReference
{
    public const TYPE_USER = 'user';
    public const TYPE_GROUP = 'group';

    /** Matches `@user:123` / `@group:5` (capture groups: type, uid). */
    public const ID_PATTERN = '/^@(user|group):(\d+)$/';

    public function __construct(
        public string $type,
        public int $uid,
        public string $label,
        public string $rawId,
    ) {
    }

    public function isUser(): bool
    {
        return $this->type === self::TYPE_USER;
    }

    public function isGroup(): bool
    {
        return $this->type === self::TYPE_GROUP;
    }

    public static function isValidRawId(string $rawId): bool
    {
        return (bool)preg_match(self::ID_PATTERN, $rawId);
    }
}
