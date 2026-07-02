<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Hooks;

use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\Schema\TcaSchemaFactory;
use WebVision\KanbanWorkspaces\Configuration\EmConfiguration;

/**
 * DataHandler hook that (optionally) prevents a workspace record's stage from being
 * reset to the editing stage (stage 0) after a field update. The behaviour is gated
 * by the `disableResetToEditingStage` extension configuration option.
 *
 * The stage is adjusted in `processDatamap_postProcessFieldArray`, i.e. before the
 * record is persisted, to avoid a follow-up write to repair a reset stage.
 */
#[Autoconfigure(public: true)]
final class PreventResetToEditingStageDataHandlerHook
{
    public function __construct(
        private readonly EmConfiguration $emConfiguration,
        private readonly TcaSchemaFactory $tcaSchemaFactory,
    ) {
    }

    /**
     * @param array<string, mixed> $fieldArray
     */
    public function processDatamap_postProcessFieldArray(
        string $status,
        string $table,
        int|string $id,
        array &$fieldArray,
        DataHandler $dataHandler,
    ): void {
        if ($status !== 'update') {
            return;
        }
        if (!$this->tcaSchemaFactory->has($table)) {
            return;
        }
        if (!$this->tcaSchemaFactory->get($table)->isWorkspaceAware()) {
            return;
        }
        if (!$this->emConfiguration->getDisableResetToEditingStage()) {
            return;
        }

        // TYPO3 sets `t3ver_stage` to hardcoded (int)`0` for all workspace aware records
        // on update any by removing it from the `$fieldArray` the value is not updated,
        // the behaviour we intend here based on the configuration option.
        unset($fieldArray['t3ver_stage']);
    }
}
