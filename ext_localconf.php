<?php

defined('TYPO3') or die();

(static function () {
    // Register backend module route
    $GLOBALS['TYPO3_CONF_VARS']['BE']['defaultUserTSconfig'] .= '
        options.pageTree.doktypesToShowInNewPageDragArea := addToList(254)
    ';
})();
