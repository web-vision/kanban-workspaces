<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Mention;

use WebVision\KanbanWorkspaces\Mention\Dto\MentionReference;

/**
 * Allowlist sanitizer for Kanban comment HTML (CKEditor output).
 * Keeps mention spans with a valid data-mention attribute.
 */
final class CommentHtmlSanitizer
{
    private const ALLOWED_TAGS = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'span',
    ];

    public function sanitize(string $html): string
    {
        $html = trim($html);
        if ($html === '') {
            return '';
        }

        // Plain text comments (legacy): escape and wrap.
        if (!$this->looksLikeHtml($html)) {
            return '<p>' . htmlspecialchars($html, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '</p>';
        }

        $wrapped = '<?xml encoding="UTF-8"><div id="kanban-sanitize-root">' . $html . '</div>';
        $previous = libxml_use_internal_errors(true);
        $document = new \DOMDocument();
        $loaded = $document->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if (!$loaded) {
            return htmlspecialchars(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        $root = $document->getElementById('kanban-sanitize-root');
        if (!$root instanceof \DOMElement) {
            return '';
        }

        $this->sanitizeChildren($root);

        $result = '';
        foreach ($root->childNodes as $child) {
            $result .= $document->saveHTML($child);
        }
        return trim($result);
    }

    private function sanitizeChildren(\DOMNode $parent): void
    {
        $child = $parent->firstChild;
        while ($child !== null) {
            $next = $child->nextSibling;

            if ($child instanceof \DOMText) {
                $child = $next;
                continue;
            }

            if (!$child instanceof \DOMElement) {
                $parent->removeChild($child);
                $child = $next;
                continue;
            }

            $tag = strtolower($child->tagName);
            if (!in_array($tag, self::ALLOWED_TAGS, true)) {
                while ($child->firstChild !== null) {
                    $parent->insertBefore($child->firstChild, $child);
                }
                $parent->removeChild($child);
                $this->sanitizeChildren($parent);
                return;
            }

            $this->sanitizeAttributes($child, $tag);
            $this->sanitizeChildren($child);
            $child = $next;
        }
    }

    private function sanitizeAttributes(\DOMElement $element, string $tag): void
    {
        $allowed = match ($tag) {
            'a' => ['href', 'title', 'rel', 'target'],
            'span' => ['class', 'data-mention'],
            default => [],
        };

        $toRemove = [];
        foreach (iterator_to_array($element->attributes ?? []) as $attribute) {
            $name = strtolower($attribute->name);
            if (!in_array($name, $allowed, true)) {
                $toRemove[] = $attribute->name;
                continue;
            }
            if ($name === 'href' && !$this->isSafeHref(trim($attribute->value))) {
                $toRemove[] = $attribute->name;
                continue;
            }
            if ($name === 'data-mention') {
                $value = trim($attribute->value);
                if (!MentionReference::isValidRawId($value)) {
                    $toRemove[] = $attribute->name;
                } else {
                    $element->setAttribute('class', 'mention');
                }
                continue;
            }
            if ($name === 'class' && $tag === 'span') {
                $classes = preg_split('/\s+/', trim($attribute->value)) ?: [];
                $safe = array_values(array_intersect($classes, ['mention']));
                if ($safe === []) {
                    $toRemove[] = $attribute->name;
                } else {
                    $element->setAttribute('class', implode(' ', $safe));
                }
                continue;
            }
            if ($name === 'target' && !in_array($attribute->value, ['_blank', '_self'], true)) {
                $toRemove[] = $attribute->name;
            }
        }
        foreach ($toRemove as $name) {
            $element->removeAttribute($name);
        }
    }

    private function isSafeHref(string $href): bool
    {
        if ($href === '' || str_starts_with($href, '#')) {
            return true;
        }
        $lower = strtolower($href);
        foreach (['javascript:', 'data:', 'vbscript:'] as $dangerous) {
            if (str_starts_with($lower, $dangerous)) {
                return false;
            }
        }
        return (bool)preg_match('#^(https?:)?//#i', $href)
            || str_starts_with($href, 't3://')
            || str_starts_with($href, 'mailto:');
    }

    private function looksLikeHtml(string $value): bool
    {
        return (bool)preg_match('/<[a-zA-Z][^>]*>/', $value);
    }
}
