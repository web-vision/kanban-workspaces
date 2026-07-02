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
#[Autoconfigure(constructor: 'create')]
final readonly class EmConfiguration
{
    public function __construct(
        private bool $disableResetToEditingStage = false,
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
}
