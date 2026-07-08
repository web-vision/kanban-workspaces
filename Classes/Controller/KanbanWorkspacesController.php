<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Controller;

use Psr\Http\Message\ResponseInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Configuration\TranslationConfigurationProvider;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Template\ModuleTemplate;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Backend\Tree\View\PageTreeView;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Imaging\IconFactory;
use TYPO3\CMS\Core\Imaging\IconSize;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Extbase\Mvc\Controller\ActionController;
use TYPO3\CMS\Workspaces\Domain\Repository\WorkspaceRepository;
use TYPO3\CMS\Workspaces\Domain\Repository\WorkspaceStageRepository;
use TYPO3\CMS\Workspaces\Service\StagesService;
use TYPO3\CMS\Workspaces\Service\WorkspaceService;
use WebVision\KanbanWorkspaces\Configuration\EmConfiguration;

/**
 * Backend module controller for Kanban Workspaces - TYPO3 v13 compatible
 */
#[AsController]
class KanbanWorkspacesController extends ActionController
{
    protected ModuleTemplate $moduleTemplate;
    protected PageTreeView $tree;

    public function __construct(
        protected readonly ModuleTemplateFactory $moduleTemplateFactory,
        protected readonly IconFactory $iconFactory,
        protected readonly PageRenderer $pageRenderer,
        protected readonly WorkspaceStageRepository $workspaceStageRepository,
        protected readonly WorkspaceRepository $workspaceRepository,
        protected readonly StagesService $stagesService,
        protected readonly EmConfiguration $emSettings,
        protected readonly TranslationConfigurationProvider $translationConfigurationProvider,
        protected readonly ConnectionPool $connectionPool,
        protected readonly UriBuilder $backendUriBuilder,
    ) {
    }

    /**
     * Main index action for the Kanban Workspaces backend module
     */
    public function indexAction(): ResponseInterface
    {
        $moduleData = $this->request->getAttribute('moduleData');
        $backendUser = $this->getBackendUser();
        $queryParams = $this->request->getQueryParams();
        $activeWorkspace = $backendUser->workspace;
        $pageUid = (int)($queryParams['id'] ?? 0);

        $workspaceIsAccessible = $backendUser->workspace !== WorkspaceService::LIVE_WORKSPACE_ID && $pageUid > 0;
        // Prepare arrays to avoid undefined variables
        $stageConfig = [];
        $stages = [];

        if ($workspaceIsAccessible) {
            $workspaceRecord = $this->workspaceRepository->findByUid($activeWorkspace);
            $stages = $this->workspaceStageRepository->findAllStagesByWorkspace($backendUser, $workspaceRecord);
        }

        $this->moduleTemplate = $this->moduleTemplateFactory->create($this->request);

        // Build stage config. If disabling default stages, include only custom stages (uid >= 1).
        $order = 0;
        foreach ($stages as $stage) {
            $checklist = $this->getChecklistForStage((int)$stage->uid);
            $stageConfig[] = [
                'id' => $stage->uid,
                'label' => $this->stagesService->getStageTitle((int)$stage->uid),
                'color' => '#FF5733',
                'allowEdit' => $stage->isEditStage,
                'allowDelete' => $stage->isAllowed,
                'order' => $order++,
                'checklist' => $checklist,
            ];
        }

        $showNoCustomStagesWarning = $workspaceIsAccessible
            && $stageConfig === [];

        $selectedLanguage = (string)($moduleData?->get('language', 'all') ?? 'all');
        $selectedDepth = (int)($moduleData?->get('depth', '0') ?? 0);
        $selectedStage = (int)($moduleData?->get('stage', '-99') ?? -99);

        // Assign variables to template
        $this->moduleTemplate->assignMultiple([
            'moduleTitle' => 'Kanban Workspaces',
            'workspaceIsAccessible' => !$workspaceIsAccessible,
            'showNoCustomStagesWarning' => $showNoCustomStagesWarning,
        ]);

        $depth = [];
        for ($i = 0; $i <= 4; $i++) {
            $depth[] = [
                'id' => $i,
                'label' => $i === 0 ? 'This Page' : "$i Level" . ($i > 1 ? 's' : ''),
            ];
        }
        $depth[] = [
            'id' => 999,
            'label' => 'Infinite',
        ];

        $this->pageRenderer->addInlineSetting('FormEngine', 'moduleUrl', (string)$this->backendUriBuilder->buildUriFromRoute('record_edit'));
        $this->pageRenderer->addInlineSetting('Workspaces', 'id', $pageUid);
        $this->pageRenderer->addInlineSetting('WebLayout', 'moduleUrl', (string)$this->backendUriBuilder->buildUriFromRoute('web_layout'));
        $this->pageRenderer->addInlineSetting('ajaxUrls', 'kanban_workspace_assign', (string)$this->backendUriBuilder->buildUriFromRoute('ajax_kanban_workspace_assign'));

        // Add TYPO3.lang labels for workspace stage transitions (matching EXT:workspaces)
        $this->pageRenderer->addInlineLanguageLabelArray([
            'ok' => 'OK',
            'cancel' => 'Cancel',
            'actionSendToStage' => 'Send to stage',
            'window.sendToNextStageWindow.itemsWillBeSentTo' => 'The selected element(s) will be sent to',
            'window.sendToNextStageWindow.selectAll' => 'Select all',
            'window.sendToNextStageWindow.deselectAll' => 'Uncheck all',
            'window.sendToNextStageWindow.sendMailTo' => 'Send mail to',
            'window.sendToNextStageWindow.additionalRecipients' => 'Additional recipients',
            'window.sendToNextStageWindow.additionalRecipients.hint' => 'One recipient per line',
            'window.sendToNextStageWindow.comments' => 'Comments',
            'window.assign.title' => 'Assign Record',
            'labels.title' => 'Title',
            'labels.description' => 'Description',
            'labels.assignee' => 'Assignee (Backend user UID)',
            'labels.selectUser' => '-- Select user --',
        ]);

        // Add CSS and JS
        $this->addAssets();
        $this->configureKanban([
            'pageUid' => $pageUid,
            'workspaceId' => $activeWorkspace,
            'stages' => $stageConfig,
            'selectedLanguage' => $selectedLanguage,
            'selectedDepth' => $selectedDepth,
            'selectedStage' => $selectedStage,
            'beUsers' => $this->getBackendUsersList(),
            'filters' => [
                'depth' => [
                    'label' => 'Depth',
                    'options' => $depth,
                ],
                'language' => [
                    'label' => 'Language',
                    'options' => $this->getSystemLanguages($pageUid),
                ],
                'stage' => [
                    'label' => 'Stage',
                    'options' => $stageConfig,
                ],
            ],
        ]);
        return $this->moduleTemplate->renderResponse('KanbanWorkspaces/Index');
    }

    /**
     * Add CSS and JS assets
     */
    protected function addAssets(): void
    {
        $this->pageRenderer->addCssFile('EXT:kanban_workspaces/Resources/Public/Css/Styles.css');
        $this->pageRenderer->addCssFile('EXT:kanban_workspaces/Resources/Public/Css/Fontawesome.min.css');
        $this->pageRenderer->loadJavaScriptModule('@web-vision/kanban-workspaces/App.js');

        // Load workspaces send-to-stage-form Web Component
        $this->pageRenderer->loadJavaScriptModule('@typo3/workspaces/renderable/send-to-stage-form.js');
    }

    /**
     * Configure Kanban board with stage configuration.
     *
     * @param array<string, mixed> $stageConfig
     */
    protected function configureKanban(array $stageConfig): void
    {
        $inlineScript = 'window.WorkspaceConfig = ' . json_encode($stageConfig) . ';';
        $this->pageRenderer->addJsFooterInlineCode('kanban-config', $inlineScript, true, true, true);
    }

    /**
     * Get checklist items for a workspace stage (only custom stages with uid > 0).
     *
     * @return array<int, array{id: int, title: string}>
     */
    protected function getChecklistForStage(int $stageUid): array
    {
        if ($stageUid < 1) {
            return [];
        }
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('tx_kanbanworkspaces_stage_checklist');
        $result = $queryBuilder
            ->select('uid', 'title')
            ->from('tx_kanbanworkspaces_stage_checklist')
            ->where(
                $queryBuilder->expr()->eq('stage', $queryBuilder->createNamedParameter($stageUid, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('deleted', 0)
            )
            ->orderBy('sorting', 'ASC')
            ->executeQuery();
        $checklistByUid = [];
        $seenTitles = [];
        while ($row = $result->fetchAssociative()) {
            $uid = (int)$row['uid'];
            $title = (string)($row['title'] ?? '');
            if ($title !== '' && !in_array($title, $seenTitles, true)) {
                $seenTitles[] = $title;
                $checklistByUid[$uid] = [
                    'id' => $uid,
                    'title' => $title,
                ];
            }
        }
        return array_values($checklistByUid);
    }

    /**
     * Get the backend user
     */
    protected function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }

    /**
     * Get list of backend users (uid, username) for assignee selectbox.
     *
     * @return list<array{uid: int, username: string}>
     */
    protected function getBackendUsersList(): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('be_users');
        $result = $queryBuilder
            ->select('uid', 'username')
            ->from('be_users')
            ->where($queryBuilder->expr()->gt('uid', 0))
            ->orderBy('username', 'ASC')
            ->executeQuery();
        $list = [];
        while ($row = $result->fetchAssociative()) {
            $list[] = [
                'uid' => (int)$row['uid'],
                'username' => (string)($row['username'] ?? ''),
            ];
        }
        return $list;
    }

    /**
     * Gets all available system languages.
     *
     * @return list<array{id: string, label: string, flagHtml: string}>
     */
    protected function getSystemLanguages(int $pageId, string $selectedLanguage = ''): array
    {
        $languages = $this->translationConfigurationProvider->getSystemLanguages($pageId);
        if (isset($languages[-1])) {
            $languages[-1]['uid'] = 'all';
        }
        $languagesNew = [];
        foreach ($languages as &$language) {
            // needs to be strict type checking as this is not possible in fluid
            if ((string)$language['uid'] === $selectedLanguage) {
                $language['active'] = true;
            }
            $languagesNew[] = [
                'id' => (string)$language['uid'],
                'label' => $language['title'],
                // Pre-rendered core icon markup shown in the language filter's
                // input-group prefix (flags cannot be rendered inside <option>).
                'flagHtml' => $this->iconFactory->getIcon($language['flagIcon'], IconSize::SMALL)->render(),
            ];
        }
        return $languagesNew;
    }
}
