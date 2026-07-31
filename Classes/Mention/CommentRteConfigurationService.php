<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Mention;

use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Configuration\Richtext;
use TYPO3\CMS\Core\Utility\PathUtility;

/**
 * Resolves the core default RTE preset into CKEditor 5 options for Kanban comments.
 * Mention plugin/feed is injected client-side so the editor matches content-element RTE.
 */
final class CommentRteConfigurationService
{
    public function __construct(
        private readonly Richtext $richtext,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getEditorOptions(int $pageUid): array
    {
        $configuration = $this->richtext->getConfiguration(
            'tx_kanbanworkspaces',
            'comment',
            max(0, $pageUid),
            '',
            [
                'enableRichtext' => true,
                'richtextConfiguration' => 'default',
            ]
        );

        $editorConfig = [];
        if (is_array($configuration['editor']['config'] ?? null)) {
            $editorConfig = $configuration['editor']['config'];
        }

        $options = $editorConfig;
        $options['customConfig'] = $options['customConfig'] ?? '';
        $options['height'] = $options['height'] ?? 160;

        $userLang = (string)(($this->getBackendUser()->user['lang'] ?? '') ?: 'en');
        if ($userLang === 'default') {
            $userLang = 'en';
        }
        if (empty($options['language']) || (is_array($options['language']) && empty($options['language']['ui']))) {
            $options['language'] = [
                'ui' => $userLang,
                'content' => $userLang,
            ];
        } elseif (is_string($options['language'])) {
            $options['language'] = [
                'ui' => $options['language'],
                'content' => $options['language'],
            ];
        }

        if (isset($options['contentsCss'])) {
            $options['contentsCss'] = $this->resolveResourcePaths($options['contentsCss']);
        } else {
            $options['contentsCss'] = [];
        }

        // Mention chip styling (plugin itself is injected in CommentRte.ts).
        $mentionCss = PathUtility::getPublicResourceWebPath(
            'EXT:kanban_workspaces/Resources/Public/Css/RteMentions.css'
        );
        if (!in_array($mentionCss, $options['contentsCss'], true)) {
            $options['contentsCss'][] = $mentionCss;
        }

        return $options;
    }

    /**
     * @param string|list<string> $paths
     * @return list<string>
     */
    private function resolveResourcePaths(string|array $paths): array
    {
        $list = is_array($paths) ? $paths : [$paths];
        $resolved = [];
        foreach ($list as $path) {
            if (!is_string($path) || $path === '') {
                continue;
            }
            if (PathUtility::isExtensionPath($path)) {
                $resolved[] = PathUtility::getPublicResourceWebPath($path);
            } else {
                $resolved[] = $path;
            }
        }
        return $resolved;
    }

    private function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }
}
