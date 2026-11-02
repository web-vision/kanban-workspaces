<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Configuration;

use Symfony\Component\DependencyInjection\Attribute\Autoconfigure;
use TYPO3\CMS\Core\Configuration\Exception\ExtensionConfigurationExtensionNotConfiguredException;
use TYPO3\CMS\Core\Configuration\Exception\ExtensionConfigurationPathDoesNotExistException;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;

/**
 * Extension Manager configuration accessor for EXT:kanban_workspaces.
 *
 * The instance is created through the {@see self::create()} factory, which is
 * wired via the `#[Autoconfigure(constructor: ...)]` attribute so the raw
 * extension configuration values are parsed and type-cast before construction.
 */
#[Autoconfigure(constructor: 'create', public: true)]
final readonly class EmConfiguration
{
    public function __construct(
        private bool $disableResetToEditingStage = false,
        private bool $hideReadyToPublishStage = false,
        private bool $skipSendToStageDialog = false,
        private string $customStageEditTitle = '',
        private string $customStageReadyToPublishTitle = '',
        private string $customStagePublishTitle = '',
    ) {
    }

    /**
     * Static factory used to build the immutable configuration value object.
     *
     * The `#[Autoconfigure(constructor: 'create')]` attribute on this class tells
     * the DI container to instantiate the service through this method instead of
     * calling the constructor directly. That lets us autowire the
     * {@see ExtensionConfiguration} service here, read the raw extension
     * configuration and type-cast the loosely typed values (the Extension Manager
     * stores booleans as `"0"`/`"1"` strings) before they are handed to the
     * strictly typed constructor.
     *
     * Missing or not-yet-synchronized configuration is treated as "not set" and
     * falls back to the constructor defaults.
     */
    public static function create(ExtensionConfiguration $extensionConfiguration): self
    {
        try {
            $configuration = $extensionConfiguration->get('kanban_workspaces');
        } catch (ExtensionConfigurationExtensionNotConfiguredException|ExtensionConfigurationPathDoesNotExistException) {
            $configuration = [];
        }
        if (!is_array($configuration)) {
            return new self();
        }

        return new self(
            disableResetToEditingStage: (bool)($configuration['disableResetToEditingStage'] ?? false),
            hideReadyToPublishStage: (bool)($configuration['hideReadyToPublishStage'] ?? false),
            skipSendToStageDialog: (bool)($configuration['skipSendToStageDialog'] ?? false),
            customStageEditTitle: (string)($configuration['customStageEditTitle'] ?? ''),
            customStageReadyToPublishTitle: (string)($configuration['customStageReadyToPublishTitle'] ?? ''),
            customStagePublishTitle: (string)($configuration['customStagePublishTitle'] ?? ''),
        );
    }

    /**
     * Whether the "disable reset to editing stage" option is enabled.
     *
     * When `true`, the {@see \WebVision\KanbanWorkspaces\Hooks\PreventResetToEditingStageDataHandlerHook}
     * prevents TYPO3's DataHandler from resetting a workspace record's stage back
     * to the editing stage (stage 0) after a field update, so the record keeps its
     * current workflow stage. Defaults to `false`.
     */
    public function getDisableResetToEditingStage(): bool
    {
        return $this->disableResetToEditingStage;
    }

    /**
     * Whether the default "Ready to publish" stage (``StagesService::STAGE_PUBLISH_ID``) is hidden.
     *
     * When `true`, the {@see \WebVision\KanbanWorkspaces\Domain\Repository\WorkspaceStageRepository}
     * drops the stage from the stage list of every workspace that does not require it, so the
     * workflow steps directly from "Editing" to "Publish". Defaults to `false`.
     */
    public function getHideReadyToPublishStage(): bool
    {
        return $this->hideReadyToPublishStage;
    }

    /**
     * Whether the kanban board skips the "Send to stage" dialog.
     *
     * When `true`, a stage change on the board (drag & drop, the stage buttons in the
     * preview modal) is executed right away without a comment, unless the dialog has
     * something to decide: mail recipients or a stage checklist. Defaults to `false`.
     */
    public function getSkipSendToStageDialog(): bool
    {
        return $this->skipSendToStageDialog;
    }

    /**
     * Custom title for the default "Editing" stage (``StagesService::STAGE_EDIT_ID``).
     *
     * Either a hard-coded string or a ``LLL:EXT:...`` translation reference. An
     * empty value (default) keeps TYPO3's original stage title.
     */
    public function getCustomStageEditTitle(): string
    {
        return $this->customStageEditTitle;
    }

    /**
     * Custom title for the default "Ready to publish" stage (``StagesService::STAGE_PUBLISH_ID``).
     *
     * Either a hard-coded string or a ``LLL:EXT:...`` translation reference. An
     * empty value (default) keeps TYPO3's original stage title.
     */
    public function getCustomStageReadyToPublishTitle(): string
    {
        return $this->customStageReadyToPublishTitle;
    }

    /**
     * Custom title for the default "Publish" stage (``StagesService::STAGE_PUBLISH_EXECUTE_ID``).
     *
     * Either a hard-coded string or a ``LLL:EXT:...`` translation reference. An
     * empty value (default) keeps TYPO3's original stage title.
     */
    public function getCustomStagePublishTitle(): string
    {
        return $this->customStagePublishTitle;
    }
}
