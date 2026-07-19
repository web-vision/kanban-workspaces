<?php

declare(strict_types=1);

/*
 * This file is part of the "kanban_workspaces" Extension for TYPO3 CMS.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace WebVision\KanbanWorkspaces\Tests\Functional\Controller;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Backend\Configuration\TranslationConfigurationProvider;
use TYPO3\CMS\Backend\Routing\Route;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Core\Core\SystemEnvironmentBuilder;
use TYPO3\CMS\Core\Http\NormalizedParams;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Imaging\IconFactory;
use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Controller\KanbanWorkspacesController;

/**
 * Covers language-filter icon rendering (#37) and DocHeader presence (#43).
 *
 * Flags cannot be rendered inside `<option>` text, so the controller ships the
 * flag markup (`flagHtml`) rendered through the TYPO3 icon API for the
 * input-group prefix. The rendering uses the `IconSize` enum, which is the only
 * form valid on both TYPO3 v13 and v14 (the legacy `Icon::SIZE_*` string sizes
 * are deprecated in v13 and removed in v14, see forge #101475). Running this
 * test in both core versions of the CI matrix therefore verifies dual-core
 * compatibility of the icon rendering.
 *
 * The DocHeader cases guard the page-tree toggle / breadcrumb bar that must be
 * rendered via the core Module layout (same pattern as EXT:viewpage).
 */
final class KanbanWorkspacesControllerTest extends FunctionalTestCase
{
    /**
     * @var string[]
     */
    protected array $coreExtensionsToLoad = [
        'typo3/cms-workspaces',
    ];

    /**
     * @var string[]
     */
    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/be_users_admin.csv');
        $this->setUpBackendUser(1);
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->create('default');
    }

    #[Test]
    public function getSystemLanguagesReturnsFlagHtmlForEveryLanguage(): void
    {
        $languages = $this->invokeGetSystemLanguages();

        self::assertNotEmpty($languages);
        foreach ($languages as $language) {
            self::assertArrayHasKey('id', $language);
            self::assertArrayHasKey('label', $language);
            self::assertArrayHasKey('flagHtml', $language);
            self::assertIsString($language['flagHtml']);
            self::assertNotSame('', $language['flagHtml'], 'flagHtml must carry rendered icon markup');
        }
    }

    #[Test]
    public function getSystemLanguagesRendersAllLanguagesFlagIcon(): void
    {
        $languages = $this->invokeGetSystemLanguages();

        $all = array_values(array_filter(
            $languages,
            static fn (array $language): bool => $language['id'] === 'all'
        ));

        self::assertCount(1, $all, 'The "All languages" pseudo-language must be present exactly once');
        // Proves IconFactory->getIcon('flags-multiple', IconSize::SMALL)->render()
        // works on the running core version and produced real icon markup.
        self::assertStringContainsString('flags-multiple', $all[0]['flagHtml']);
        self::assertStringContainsString('<', $all[0]['flagHtml']);
    }

    #[Test]
    public function indexTemplateUsesCoreModuleLayout(): void
    {
        $extensionRoot = dirname(__DIR__, 3);
        $templatePath = $extensionRoot . '/Resources/Private/Templates/KanbanWorkspaces/Index.html';
        self::assertFileExists($templatePath);
        $template = (string)file_get_contents($templatePath);

        // EXT:viewpage pattern: core Module layout, no extension override.
        self::assertStringContainsString('<f:layout name="Module" />', $template);
        self::assertFileDoesNotExist($extensionRoot . '/Resources/Private/Layouts/Module.html');
        self::assertStringContainsString('data-islive', $template);
    }

    #[Test]
    public function indexTemplateRendersModuleDocHeaderWithNavigationToggle(): void
    {
        $request = (new ServerRequest('https://localhost/typo3/module/web/kanbanworkspaces', 'GET'))
            ->withAttribute('applicationType', SystemEnvironmentBuilder::REQUESTTYPE_BE)
            ->withAttribute('route', (new Route('/module/web/kanbanworkspaces', []))->setOption('packageName', 'web-vision/kanban-workspaces'))
            ->withQueryParams(['id' => 0]);
        $request = $request->withAttribute('normalizedParams', NormalizedParams::createFromRequest($request));

        $moduleTemplate = $this->get(ModuleTemplateFactory::class)->create($request);
        $moduleTemplate->setTitle('Kanban Workspaces', '');
        $moduleTemplate->assignMultiple([
            'workspaceIsAccessible' => true,
            'showNoCustomStagesWarning' => false,
        ]);

        $html = (string)$moduleTemplate->renderResponse('KanbanWorkspaces/Index')->getBody();

        self::assertStringContainsString('module-docheader', $html);
        self::assertStringContainsString('data-islive="true"', $html);
        if ((new Typo3Version())->getMajorVersion() >= 14) {
            self::assertStringContainsString('typo3-backend-content-navigation-toggle', $html);
        }
    }

    /**
     * Invokes the protected controller method that builds the language filter
     * options. Page id 1 has no site configuration in this test, so the core
     * falls back to a NullSite that always offers the "All languages" (-1) entry.
     *
     * The controller is created without its constructor (an Extbase controller
     * needs a request to be built through the container); only the two
     * dependencies the method actually uses are injected.
     *
     * @return list<array{id: string, label: string, flagHtml: string}>
     */
    private function invokeGetSystemLanguages(): array
    {
        $controller = (new \ReflectionClass(KanbanWorkspacesController::class))->newInstanceWithoutConstructor();
        $this->injectReadonly($controller, 'iconFactory', GeneralUtility::makeInstance(IconFactory::class));
        $this->injectReadonly($controller, 'translationConfigurationProvider', GeneralUtility::makeInstance(TranslationConfigurationProvider::class));

        $method = new \ReflectionMethod($controller, 'getSystemLanguages');

        return $method->invoke($controller, 1);
    }

    private function injectReadonly(object $target, string $property, object $value): void
    {
        $reflection = new \ReflectionProperty($target, $property);
        $reflection->setValue($target, $value);
    }
}
