<?php

defined('TYPO3') or die();

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

(static function () {
    // Register backend module route
    $GLOBALS['TYPO3_CONF_VARS']['BE']['defaultUserTSconfig'] .= '
        options.pageTree.doktypesToShowInNewPageDragArea := addToList(254)
    ';
})();