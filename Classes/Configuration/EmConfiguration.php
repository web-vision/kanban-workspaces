<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Configuration;

use TYPO3\CMS\Core\Configuration\Exception\ExtensionConfigurationExtensionNotConfiguredException;
use TYPO3\CMS\Core\Configuration\Exception\ExtensionConfigurationPathDoesNotExistException;
use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;

/**
 * Extension Manager configuration accessor for EXT:kanban_workspaces.
 */
final class EmConfiguration
{
    private bool $disableDefaultStage = true;
    private int $defaultStageId = 0;

    public function __construct(ExtensionConfiguration $extensionConfiguration)
    {
        try {
            $configuration = $extensionConfiguration->get('kanban_workspaces');
        } catch (ExtensionConfigurationExtensionNotConfiguredException|ExtensionConfigurationPathDoesNotExistException) {
            $configuration = [];
        }
        if (!is_array($configuration)) {
            return;
        }
        if (array_key_exists('disableDefaultStage', $configuration)) {
            $this->disableDefaultStage = (bool)$configuration['disableDefaultStage'];
        }
        if (array_key_exists('defaultStageId', $configuration)) {
            $this->defaultStageId = (int)$configuration['defaultStageId'];
        }
    }

    public function getDisableDefaultStage(): bool
    {
        return $this->disableDefaultStage;
    }

    public function getDefaultStageId(): int
    {
        return $this->defaultStageId;
    }
}
