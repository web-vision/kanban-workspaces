<?php

defined('TYPO3') or die();

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

(static function () {
    // Add static TypoScript template for backend module configuration
    ExtensionManagementUtility::addStaticFile(
        'kanban_workspaces',
        'Configuration/TypoScript',
        'Kanban Workspaces Backend Module'
    );
})();
