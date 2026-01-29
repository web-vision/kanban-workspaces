<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'Kanban Workspaces',
    'description' => 'Kanban Board Extension for TYPO3 - Manage tasks and projects with an intuitive kanban interface',
    'category' => 'plugin',
    'author' => 'WebVision',
    'author_email' => 'info@devzspace.com',
    'state' => 'stable',
    'version' => '1.0.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.0-13.4.99',
            'php' => '8.2.0-8.3.99',
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
