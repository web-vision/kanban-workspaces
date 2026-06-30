<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'Kanban Workspaces',
    'description' => 'Kanban Board Extension for TYPO3: Manage tasks and projects with an intuitive kanban interface',
    'category' => 'plugin',
    'author' => 'web-vision GmbH Team',
    'author_email' => 'hello@web-vision.de',
    'author_company' => 'web-vision GmbH',
    'state' => 'alpha',
    'version' => '0.0.2',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.25-14.99.99',
            'workspaces' => '13.4.25-14.99.99',
            'php' => '8.2.0-8.5.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
    'autoload' => [
        'psr-4' => [
            'WebVision\\KanbanWorkspaces\\' => 'Classes/',
        ],
    ],
];
