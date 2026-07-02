<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Hooks;

use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Database\ConnectionPool;
use WebVision\KanbanWorkspaces\Configuration\EmConfiguration;

/**
 * @todo `processDatamap_afterDatabaseOperations` seems not the proper stage, it would be better to modify
 *       the stage before it is persisted to safe roundtrips in case it get reset. Analyse this deeper in
 *       the aftermath and adjust it.
 * @todo This class nees rework and harding; also test coverage is missing.
 */
#[Autoconfigure(public: true)]
final class DefaultStageDataHandlerHook
{
    public function __construct(
        private readonly ConnectionPool $connectionPool,
        private readonly EmConfiguration $emConfiguration,
    ) {
    }
}
