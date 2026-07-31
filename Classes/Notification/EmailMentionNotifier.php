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
 * Email channel for @mention notifications (FluidEmail, mirrors AssignmentNotificationService).
 */
final class EmailMentionNotifier implements MentionNotifierInterface
{
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

    public function __construct(
        private readonly MailerInterface $mailer,
        private readonly LoggerInterface $logger,
        private readonly StagesService $stagesService,
        private readonly PreviewUriBuilder $previewUriBuilder,
    ) {
    }

    public function notify(array $recipients, array $context): void
    {
        if ($recipients === []) {
            return;
        }

        $tableName = (string)$context['tableName'];
        $recordUid = (int)$context['recordUid'];
        $workspaceId = (int)$context['workspaceId'];
        $stageId = (int)$context['stageId'];
        $commentHtml = (string)$context['commentHtml'];

        $workspace = BackendUtility::getRecord('sys_workspace', $workspaceId);
        if (!is_array($workspace)) {
            $workspace = ['uid' => $workspaceId, 'title' => (string)$workspaceId];
        }

        $record = BackendUtility::getRecord($tableName, $recordUid);
        if (!is_array($record)) {
            $record = ['uid' => $recordUid, 'pid' => 0];
        }
        $recordTitle = (string)($context['recordTitle'] ?? BackendUtility::getRecordTitle($tableName, $record));

        $pageUid = $tableName === 'pages' ? $recordUid : (int)($record['pid'] ?? 0);
        $rootLine = $pageUid > 0 ? BackendUtility::getRecordPath($pageUid, '', 20) : '';

        $emailConfig = BackendUtility::getPagesTSconfig($pageUid)['tx_workspaces.']['emails.'] ?? [];
        $emailConfig = GeneralUtility::removeDotsFromTS($emailConfig);

        $previewLink = '';
        if ($pageUid > 0) {
            try {
                $languageId = (int)($record[$GLOBALS['TCA'][$tableName]['ctrl']['languageField'] ?? null] ?? 0);
                $previewLink = $this->previewUriBuilder->buildUriForPage($pageUid, $languageId);
            } catch (UnableToLinkToPageException) {
                // No preview link
            }
        }

        $beUser = $GLOBALS['BE_USER'] ?? null;
        $currentUserRecord = [
            'username' => $beUser?->user['username'] ?? '',
            'realName' => $beUser?->user['realName'] ?? $beUser?->user['username'] ?? '',
        ];

        $variablesForView = [
            'workspace' => $workspace,
            'recordTitle' => $recordTitle,
            'rootLine' => $rootLine,
            'currentUser' => $currentUserRecord,
            'commentHtml' => $commentHtml,
            'commentText' => trim(html_entity_decode(strip_tags($commentHtml), ENT_QUOTES | ENT_HTML5, 'UTF-8')),
            'stageTitle' => $this->stagesService->getStageTitle($stageId),
            'previewLink' => $previewLink,
            'tableName' => $tableName,
            'recordUid' => $recordUid,
        ];

        foreach ($recipients as $recipient) {
            try {
                $this->sendEmail($recipient, $emailConfig, $variablesForView);
                $this->logger->info('Mention notification email sent to "{recipient}"', [
                    'recipient' => $recipient['email'],
                    'record' => $tableName . ':' . $recordUid,
                ]);
            } catch (TransportException $e) {
                $this->logger->warning('Could not send mention notification email to "{recipient}"', [
                    'recipient' => $recipient['email'],
                    'exception' => $e,
                ]);
            } catch (RfcComplianceException $e) {
                $this->logger->warning('Could not send mention notification email to "{recipient}" due to invalid email address', [
                    'recipient' => $recipient['email'],
                    'exception' => $e,
                ]);
            } catch (\Throwable $e) {
                $this->logger->error('Mention notification email failed for "{recipient}"', [
                    'recipient' => $recipient['email'],
                    'exception' => $e,
                ]);
            }
        }
    }

    /**
     * @param array{email: string, realName?: string, lang?: string} $recipientData
     * @param array<string, mixed> $emailConfig
     * @param array<string, mixed> $variablesForView
     */
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
            ->subject('TYPO3 Workspaces: You were mentioned')
            ->setTemplate('MentionNotification')
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
