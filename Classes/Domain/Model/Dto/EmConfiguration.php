<?php

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace Devzspace\KanbanWorkspaces\Domain\Model\Dto;

use TYPO3\CMS\Core\Configuration\ExtensionConfiguration;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Extension Manager configuration
 */
class EmConfiguration
{
    /**
     * Fill the properties properly
     *
     * @param array $configuration em configuration
     */
    public function __construct(array $configuration = [])
    {
        if (empty($configuration)) {
            try {
                $extensionConfiguration = GeneralUtility::makeInstance(ExtensionConfiguration::class);
                $configuration = $extensionConfiguration->get('kanban_workspaces');
            } catch (\Exception) {
                // do nothing
            }
        }
        foreach ($configuration as $key => $value) {
            if (property_exists(self::class, $key)) {
                $this->$key = $value;
            }
        }
    }

    /** @var bool */
    protected $disableDefaultStage = true;

    public function getDisableDefaultStage(): bool
    {
        return (bool)$this->disableDefaultStage;
    }

    /** @var bool */
    protected $defaultStageId = 0;
    public function getDefaultStageId(): int
    {
        return (int)$this->defaultStageId;
    }
}
