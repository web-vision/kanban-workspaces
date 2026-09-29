<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Mention\Dto;

/**
 * Serializable suggestion row for the CKEditor Mention feed / suggest API.
 *
 * @phpstan-type SuggestionArray array{
 *     id: string,
 *     text: string,
 *     type: string,
 *     uid: int,
 *     username?: string,
 *     email?: string,
 *     role?: string,
 *     avatarUrl?: string|null,
 *     memberCount?: int,
 *     memberUserIds?: list<int>
 * }
 */
final readonly class MentionSuggestion
{
    public function __construct(
        public string $type,
        public int $uid,
        public string $text,
        public string $id,
        public ?string $email = null,
        public ?string $username = null,
        public ?string $role = null,
        public ?string $avatarUrl = null,
        public ?int $memberCount = null,
        /** @var list<int>|null */
        public ?array $memberUserIds = null,
    ) {
    }

    /**
     * @return SuggestionArray
     */
    public function toArray(): array
    {
        $data = [
            'id' => $this->id,
            'text' => $this->text,
            'type' => $this->type,
            'uid' => $this->uid,
        ];
        if ($this->username !== null) {
            $data['username'] = $this->username;
        }
        if ($this->email !== null) {
            $data['email'] = $this->email;
        }
        if ($this->role !== null) {
            $data['role'] = $this->role;
        }
        if ($this->avatarUrl !== null) {
            $data['avatarUrl'] = $this->avatarUrl;
        }
        if ($this->memberCount !== null) {
            $data['memberCount'] = $this->memberCount;
        }
        if ($this->memberUserIds !== null) {
            $data['memberUserIds'] = $this->memberUserIds;
        }
        return $data;
    }
}
