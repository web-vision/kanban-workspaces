<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Mention;

use WebVision\KanbanWorkspaces\Mention\Dto\MentionReference;

/**
 * Extracts CKEditor mention spans (`data-mention="@user:123"` / `@group:5`) from HTML.
 */
final class MentionParser
{
    /**
     * @return list<MentionReference>
     */
    public function parse(string $html): array
    {
        $html = trim($html);
        if ($html === '') {
            return [];
        }

        $seen = [];
        $mentions = $this->looksLikeHtml($html) ? $this->parseFromDom($html, $seen) : [];

        return $mentions !== [] ? $mentions : $this->parseFromRegex($html, $seen);
    }

    /**
     * @param array<string, true> $seen
     * @return list<MentionReference>
     */
    private function parseFromDom(string $html, array &$seen): array
    {
        $wrapped = '<?xml encoding="UTF-8"><div id="kanban-mention-root">' . $html . '</div>';
        $previous = libxml_use_internal_errors(true);
        $document = new \DOMDocument();
        $loaded = $document->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if (!$loaded) {
            return [];
        }

        $mentions = [];
        $nodes = (new \DOMXPath($document))->query('//*[@data-mention]');
        if ($nodes === false) {
            return [];
        }

        foreach ($nodes as $node) {
            if (!$node instanceof \DOMElement) {
                continue;
            }
            $reference = $this->createReference(
                trim($node->getAttribute('data-mention')),
                trim($node->textContent),
                $seen
            );
            if ($reference !== null) {
                $mentions[] = $reference;
            }
        }

        return $mentions;
    }

    /**
     * @param array<string, true> $seen
     * @return list<MentionReference>
     */
    private function parseFromRegex(string $html, array &$seen): array
    {
        $mentions = [];
        if (!preg_match_all('/data-mention=["\'](@(?:user|group):\d+)["\']/i', $html, $attrMatches)) {
            return [];
        }
        foreach ($attrMatches[1] as $rawId) {
            $reference = $this->createReference($rawId, $rawId, $seen);
            if ($reference !== null) {
                $mentions[] = $reference;
            }
        }
        return $mentions;
    }

    /**
     * @param array<string, true> $seen
     */
    private function createReference(string $rawId, string $label, array &$seen): ?MentionReference
    {
        if ($rawId === '' || !preg_match(MentionReference::ID_PATTERN, $rawId, $matches)) {
            return null;
        }
        $type = strtolower($matches[1]);
        $uid = (int)$matches[2];
        // Type is already constrained by ID_PATTERN to user|group.
        if ($uid < 1) {
            return null;
        }
        $key = $type . ':' . $uid;
        if (isset($seen[$key])) {
            return null;
        }
        $seen[$key] = true;
        $display = $label !== '' ? ltrim($label, '@') : $rawId;
        return new MentionReference($type, $uid, $display, $rawId);
    }

    private function looksLikeHtml(string $value): bool
    {
        return (bool)preg_match('/<[a-zA-Z][^>]*>/', $value);
    }
}
