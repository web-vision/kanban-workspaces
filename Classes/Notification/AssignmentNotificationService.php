<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Notification;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Exception\RfcComplianceException;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\Mail\FluidEmail;
use TYPO3\CMS\Core\Mail\MailerInterface;
use TYPO3\CMS\Core\Routing\UnableToLinkToPageException;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Fluid\View\TemplatePaths;
use TYPO3\CMS\Workspaces\Preview\PreviewUriBuilder;
use TYPO3\CMS\Workspaces\Service\StagesService;

/**
 * Sends email notification to the assignee when they are assigned to a record in the workspace.
 * Reuses EXT:workspaces notification pattern (FluidEmail, tx_workspaces.emails.*, SystemEmail layout).
 */
class AssignmentNotificationService
{
    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly LoggerInterface $logger,
        private readonly StagesService $stagesService,
        private readonly PreviewUriBuilder $previewUriBuilder,
    ) {}

    /**
     * Notify the assignee (backend user) that they were assigned to a record.
     * Does nothing if assignee is the current user, or assignee has no valid email.
     */
    public function notifyAssignee(
        int $assigneeBeUserId,
        string $tableName,
        int $recordUid,
        int $workspaceId,
        int $stageId,
        string $assignmentTitle,
        string $assignmentDescription
    ): void {
        $beUser = $GLOBALS['BE_USER'] ?? null;
        if ($beUser && (int)$beUser->user['uid'] === $assigneeBeUserId) {
            $this->logger->debug('Assignment notification skipped: assignee is current user', ['assigneeBeUserId' => $assigneeBeUserId]);
            return;
        }

        $assignee = BackendUtility::getRecord('be_users', $assigneeBeUserId);
        if (!is_array($assignee) || empty($assignee['email']) || !GeneralUtility::validEmail($assignee['email'])) {
            $this->logger->debug('Assignment notification skipped: assignee has no valid email', [
                'assigneeBeUserId' => $assigneeBeUserId,
                'hasRecord' => is_array($assignee),
                'email' => $assignee['email'] ?? null,
            ]);
            return;
        }

        $workspace = BackendUtility::getRecord('sys_workspace', $workspaceId);
        if (!is_array($workspace)) {
            $workspace = ['uid' => $workspaceId, 'title' => (string)$workspaceId];
        }

        $record = BackendUtility::getRecord($tableName, $recordUid);
        if (!is_array($record)) {
            $record = ['uid' => $recordUid, 'pid' => 0];
        }
        $recordTitle = BackendUtility::getRecordTitle($tableName, $record);

        $pageUid = $tableName === 'pages' ? $recordUid : (int)($record['pid'] ?? 0);
        $rootLine = $pageUid > 0 ? BackendUtility::getRecordPath($pageUid, '', 20) : '';

        $emailConfig = BackendUtility::getPagesTSconfig($pageUid)['tx_workspaces.']['emails.'] ?? [];
        $emailConfig = GeneralUtility::removeDotsFromTS($emailConfig);

        $previewLink = '';
        if ($pageUid > 0) {
            try {
                $languageId = (int)($record[$GLOBALS['TCA'][$tableName]['ctrl']['languageField'] ?? null] ?? 0);
                $previewLink = $this->previewUriBuilder->buildUriForPage($pageUid, $languageId);
            } catch (UnableToLinkToPageException $e) {
                // No preview link
            }
        }

        $stageTitle = $this->stagesService->getStageTitle($stageId);

        $currentUserRecord = [
            'username' => $beUser?->user['username'] ?? '',
            'realName' => $beUser?->user['realName'] ?? $beUser?->user['username'] ?? '',
        ];

        $variablesForView = [
            'workspace' => $workspace,
            'recordTitle' => $recordTitle,
            'rootLine' => $rootLine,
            'currentUser' => $currentUserRecord,
            'assignee' => [
                'username' => $assignee['username'] ?? '',
                'realName' => $assignee['realName'] ?? $assignee['username'] ?? '',
            ],
            'assignmentTitle' => $assignmentTitle,
            'assignmentDescription' => $assignmentDescription,
            'stageTitle' => $stageTitle,
            'previewLink' => $previewLink,
            'tableName' => $tableName,
            'recordUid' => $recordUid,
        ];

        $recipientData = [
            'email' => $assignee['email'],
            'realName' => $assignee['realName'] ?? $assignee['username'] ?? '',
            'lang' => $assignee['lang'] ?? 'default',
        ];

        try {
            $this->sendEmail($recipientData, $emailConfig, $variablesForView);
            $this->logger->info('Assignment notification email sent to "{recipient}"', [
                'recipient' => $recipientData['email'],
                'record' => $tableName . ':' . $recordUid,
            ]);
        } catch (TransportException $e) {
            $this->logger->warning('Could not send assignment notification email to "{recipient}"', [
                'recipient' => $recipientData['email'],
                'exception' => $e,
            ]);
        } catch (RfcComplianceException $e) {
            $this->logger->warning('Could not send assignment notification email to "{recipient}" due to invalid email address', [
                'recipient' => $recipientData['email'],
                'exception' => $e,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('Assignment notification email failed for "{recipient}"', [
                'recipient' => $recipientData['email'],
                'exception' => $e,
            ]);
        }
    }

    /**
     * Default TYPO3 MAIL template/layout/partial paths (used when config overwrites MAIL and omits them).
     */
    private const DEFAULT_MAIL_LAYOUT_ROOT_PATHS = [
        0 => 'EXT:core/Resources/Private/Layouts/',
        10 => 'EXT:backend/Resources/Private/Layouts/',
    ];
    private const DEFAULT_MAIL_TEMPLATE_ROOT_PATHS = [
        0 => 'EXT:core/Resources/Private/Templates/Email/',
        10 => 'EXT:backend/Resources/Private/Templates/Email/',
    ];
    private const DEFAULT_MAIL_PARTIAL_ROOT_PATHS = [
        0 => 'EXT:core/Resources/Private/Partials/',
        10 => 'EXT:backend/Resources/Private/Partials/',
    ];

    private function sendEmail(array $recipientData, array $emailConfig, array $variablesForView): void
    {
        $mailDefaults = $GLOBALS['TYPO3_CONF_VARS']['MAIL'] ?? [];
        $ourTemplatePath = 'EXT:kanban_workspaces/Resources/Private/Templates/Email/';

        $templateRootPaths = array_replace(
            $mailDefaults['templateRootPaths'] ?? self::DEFAULT_MAIL_TEMPLATE_ROOT_PATHS,
            $emailConfig['templateRootPaths'] ?? []
        );
        $templateRootPaths = array_merge([$ourTemplatePath], $templateRootPaths);

        $layoutRootPaths = array_replace(
            $mailDefaults['layoutRootPaths'] ?? self::DEFAULT_MAIL_LAYOUT_ROOT_PATHS,
            $emailConfig['layoutRootPaths'] ?? []
        );
        $partialRootPaths = array_replace(
            $mailDefaults['partialRootPaths'] ?? self::DEFAULT_MAIL_PARTIAL_ROOT_PATHS,
            $emailConfig['partialRootPaths'] ?? []
        );

        $templatePaths = new TemplatePaths();
        $templatePaths->setTemplateRootPaths($templateRootPaths);
        $templatePaths->setLayoutRootPaths($layoutRootPaths);
        $templatePaths->setPartialRootPaths($partialRootPaths);

        $emailObject = GeneralUtility::makeInstance(FluidEmail::class, $templatePaths);
        $emailObject
            ->to(new Address($recipientData['email'], $recipientData['realName'] ?? ''))
            ->subject('TYPO3 Workspaces: Assignment')
            ->setTemplate('AssignmentNotification')
            ->assignMultiple($variablesForView)
            ->assign('language', $recipientData['lang'] ?? 'default');

        if (isset($GLOBALS['TYPO3_REQUEST']) && $GLOBALS['TYPO3_REQUEST'] instanceof ServerRequestInterface) {
            $emailObject->setRequest($GLOBALS['TYPO3_REQUEST']);
        }
        if (!empty($emailConfig['format'])) {
            $emailObject->format($emailConfig['format']);
        }
        if (!empty($emailConfig['senderEmail']) && GeneralUtility::validEmail($emailConfig['senderEmail'])) {
            $emailObject->from(new Address($emailConfig['senderEmail'], $emailConfig['senderName'] ?? ''));
        }

        $this->mailer->send($emailObject);
    }
}
