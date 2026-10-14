<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Tests\Functional\Controller;

use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Core\SystemEnvironmentBuilder;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\CMS\Core\Localization\LanguageServiceFactory;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;
use WebVision\KanbanWorkspaces\Controller\ChecklistAjaxController;

final class ChecklistAjaxControllerTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'workspaces',
    ];

    protected array $testExtensionsToLoad = [
        'web-vision/kanban-workspaces',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/be_users_admin.csv');
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tx_kanbanworkspaces_stage_checklist.csv');
        $this->setUpBackendUser(1);
        $GLOBALS['LANG'] = $this->get(LanguageServiceFactory::class)->create('default');
    }

    #[Test]
    public function saveActionRejectsInvalidPayload(): void
    {
        $controller = $this->get(ChecklistAjaxController::class);
        $request = $this->jsonRequest([]);
        $response = $controller->saveAction($request);

        self::assertSame(400, $response->getStatusCode());
        $body = json_decode((string)$response->getBody(), true);
        self::assertFalse($body['success']);
    }

    #[Test]
    public function saveAndGetRoundTrip(): void
    {
        $controller = $this->get(ChecklistAjaxController::class);

        $saveResponse = $controller->saveAction($this->jsonRequest([
            'table' => 'tt_content',
            'record_uid' => 42,
            'workspace_id' => 1,
            'stage_id' => 5,
            'items' => [
                ['id' => 1, 'checked' => true],
                ['id' => 2, 'checked' => false],
            ],
        ]));
        self::assertSame(200, $saveResponse->getStatusCode());
        $saveBody = json_decode((string)$saveResponse->getBody(), true);
        self::assertTrue($saveBody['success']);
        self::assertArrayNotHasKey('history', $saveBody);

        $getResponse = $controller->getAction($this->jsonRequest([
            'table' => 'tt_content',
            'record_uid' => 42,
            'workspace_id' => 1,
            'stage_id' => 5,
        ]));
        $getBody = json_decode((string)$getResponse->getBody(), true);
        self::assertTrue($getBody['success']);
        self::assertTrue($getBody['items'][0]['checked']);
        self::assertFalse($getBody['items'][1]['checked']);
        self::assertArrayNotHasKey('history', $getBody);
    }

    #[Test]
    public function toggleActionPersistsChange(): void
    {
        $controller = $this->get(ChecklistAjaxController::class);
        $response = $controller->toggleAction($this->jsonRequest([
            'table' => 'tt_content',
            'record_uid' => 42,
            'workspace_id' => 1,
            'stage_id' => 5,
            'checklist_item_uid' => 1,
            'checked' => true,
        ]));

        self::assertSame(200, $response->getStatusCode());
        $body = json_decode((string)$response->getBody(), true);
        self::assertTrue($body['success']);
        self::assertTrue($body['items'][0]['checked']);
        self::assertArrayNotHasKey('history', $body);
    }

    private function jsonRequest(array $payload): ServerRequest
    {
        $request = (new ServerRequest('https://localhost/typo3/ajax/kanban-workspace/checklist/save', 'POST'))
            ->withAttribute('applicationType', SystemEnvironmentBuilder::REQUESTTYPE_BE)
            ->withHeader('Content-Type', 'application/json')
            ->withParsedBody($payload);
        $GLOBALS['TYPO3_REQUEST'] = $request;

        return $request;
    }
}
