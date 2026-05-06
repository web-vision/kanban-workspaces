<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\EventListener;

use TYPO3\CMS\Core\Attribute\AsEventListener;
use TYPO3\CMS\Workspaces\Event\AfterCompiledCacheableDataForWorkspaceEvent;

/**
 * Backfills a literal "all" for workspace grid entries whose language could not
 * be resolved by `GridDataService` - e.g. records that carry a `sys_language_uid`
 * which no longer exists in the site configuration.
 *
 * Replaces `patches/griddata-language-fallback.patch`, which is no longer
 * applicable to TYPO3 v13.4 / v14.3 (line numbers and method signatures shifted
 * upstream). Hooking the PSR-14 event keeps the same UI behaviour without
 * touching vendor sources.
 */
final class WorkspaceLanguageFallbackListener
{
    private const FALLBACK_TITLE = 'all';

    #[AsEventListener(identifier: 'kanban-workspaces/workspace-language-fallback')]
    public function __invoke(AfterCompiledCacheableDataForWorkspaceEvent $event): void
    {
        $data = $event->getData();
        $changed = false;
        foreach ($data as $key => $item) {
            if (!is_array($item) || !isset($item['language']) || !is_array($item['language'])) {
                continue;
            }
            $title = $item['language']['title'] ?? null;
            if ($title !== null && $title !== '') {
                continue;
            }
            $data[$key]['language']['title'] = self::FALLBACK_TITLE;
            $data[$key]['language']['title_crop'] = self::FALLBACK_TITLE;
            $changed = true;
        }
        if ($changed) {
            $event->setData($data);
        }
    }
}
