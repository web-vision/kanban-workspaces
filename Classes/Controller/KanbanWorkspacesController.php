<?php

declare(strict_types=1);

namespace Devzspace\KanbanWorkspaces\Controller;

use Devzspace\KanbanWorkspaces\Domain\Model\Dto\EmConfiguration;
use Psr\Http\Message\ResponseInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Configuration\TranslationConfigurationProvider;
use TYPO3\CMS\Backend\Template\ModuleTemplate;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Backend\Tree\View\PageTreeView;
use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Imaging\IconFactory;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Extbase\Mvc\Controller\ActionController;
use TYPO3\CMS\Extbase\Utility\DebuggerUtility;
use TYPO3\CMS\Workspaces\Domain\Repository\WorkspaceRepository;
use TYPO3\CMS\Workspaces\Domain\Repository\WorkspaceStageRepository;
use TYPO3\CMS\Workspaces\Service\WorkspaceService;
use TYPO3\CMS\Core\Utility\GeneralUtility;

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
        protected readonly EmConfiguration $emSettings,
        protected readonly TranslationConfigurationProvider $translationConfigurationProvider,
    ) {}

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
        foreach ($stages as $stage) {
            // If disableDefaultStage is true, skip stages that don't look like custom stages.
            if ($this->emSettings->getDisableDefaultStage()) {
                // Defensive checks: ensure uid is set and is an integer >= 1
                if (!isset($stage->uid) || (int)$stage->uid < 1) {
                    continue;
                }
            }
            $stageConfig[] = [
                'id' => $stage->uid,
                'label' => $stage->title,
                'color' => '#FF5733',
                'allowEdit' => $stage->isEditStage,
                'allowDelete' => $stage->isAllowed,
            ];
        }

        $selectedLanguage = (string)$moduleData->get('language','all');
        $selectedDepth = (int)$moduleData->get('depth', '0');
        $selectedStage = (int)$moduleData->get('stage', '-99');        

        // Assign variables to template
        $this->moduleTemplate->assignMultiple([
            'moduleTitle' => 'Kanban Workspaces',
            'workspaceIsAccessible' => !$workspaceIsAccessible,
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

        
        $backendUriBuilder = GeneralUtility::makeInstance(\TYPO3\CMS\Backend\Routing\UriBuilder::class);
        $this->pageRenderer->addInlineSetting('FormEngine', 'moduleUrl', (string)$backendUriBuilder->buildUriFromRoute('record_edit'));
        $this->pageRenderer->addInlineSetting('Workspaces', 'id', $pageUid);
        $this->pageRenderer->addInlineSetting('WebLayout', 'moduleUrl', (string)$backendUriBuilder->buildUriFromRoute('web_layout'));

        // Add CSS and JS
        $this->addAssets();
        $this->configureKanban([
            'pageUid' => $pageUid,
            'workspaceId' => $activeWorkspace,
            'stages' => $stageConfig,
            'selectedLanguage' => $selectedLanguage,
            'selectedDepth' => $selectedDepth,
            'selectedStage' => $selectedStage,
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
     * Prototype action for the Kanban Workspaces backend module
     */
    public function prototypeAction(): ResponseInterface
    {
        $this->moduleTemplate = $this->moduleTemplateFactory->create($this->request);

        // Add CSS and JS
        $this->pageRenderer->addCssFile('EXT:kanban_workspaces/Resources/Public/Css/Styles.css');
        $this->pageRenderer->addCssFile('EXT:kanban_workspaces/Resources/Public/Css/Fontawesome.min.css');
        $this->pageRenderer->addJsFile('EXT:kanban_workspaces/Resources/Public/JavaScript/ConfigPrototype.js');
        $this->pageRenderer->loadJavaScriptModule('@devzspace/kanban-workspaces/Prototype.js');

        // Assign variables to template
        $this->moduleTemplate->assignMultiple([
            'moduleTitle' => 'Kanban Workspaces',
        ]);
        return $this->moduleTemplate->renderResponse('KanbanWorkspaces/Prototype');
    }

    /**
     * Add CSS and JS assets
     */
    protected function addAssets(): void
    {
        $this->pageRenderer->addCssFile('EXT:kanban_workspaces/Resources/Public/Css/Styles.css');
        $this->pageRenderer->addCssFile('EXT:kanban_workspaces/Resources/Public/Css/Fontawesome.min.css');
        $this->pageRenderer->addJsFile('EXT:kanban_workspaces/Resources/Public/JavaScript/Config.js');
        $this->pageRenderer->loadJavaScriptModule('@devzspace/kanban-workspaces/App.js');
    }

    /**
     * Configure Kanban board with stage configuration
     */
    protected function configureKanban(array $stageConfig): void
    {
        $inlineScript = 'window.WorkspaceConfig = ' . json_encode($stageConfig) . ';';
        $this->pageRenderer->addJsFooterInlineCode('kanban-config', $inlineScript, 'text/javascript', true, true);
    }

    /**
     * Get the backend user
     */
    protected function getBackendUser(): BackendUserAuthentication
    {
        return $GLOBALS['BE_USER'];
    }

    /**
     * Gets all available system languages.
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
                'flag' => $language['flag'] ?? '',
            ];
        }
        return $languagesNew;
    }
}
