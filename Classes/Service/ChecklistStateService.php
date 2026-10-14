<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Service;

use TYPO3\CMS\Core\Authentication\BackendUserAuthentication;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\DataHandling\History\RecordHistoryStore;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Persists per-card checklist checked state and writes audit entries into
 * core {@see RecordHistoryStore} as {@see RecordHistoryStore::ACTION_STAGECHANGE}
 * so they appear in the Kanban / workspaces **Activity** tab (same stream as
 * stage moves and comments).
 *
 * Checking is always optional — this service never enforces "all checked".
 * State is keyed per card × stage × item and is never reset on re-entry.
 */
final class ChecklistStateService
{
    private const STATE_TABLE = 'tx_kanbanworkspaces_checklist_state';

    public function __construct(
        private readonly ConnectionPool $connectionPool,
        private readonly ChecklistTemplateService $checklistTemplateService,
    ) {
    }

    /**
     * @return array<int, bool> checklist_item_uid => checked
     */
    public function getState(int $workspaceId, string $tableName, int $recordUid, int $stageId): array
    {
        if ($tableName === '' || $recordUid <= 0) {
            return [];
        }

        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::STATE_TABLE);
        $result = $queryBuilder
            ->select('checklist_item_uid', 'checked')
            ->from(self::STATE_TABLE)
            ->where(
                $queryBuilder->expr()->eq('workspace_id', $queryBuilder->createNamedParameter($workspaceId, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('table_name', $queryBuilder->createNamedParameter($tableName)),
                $queryBuilder->expr()->eq('record_uid', $queryBuilder->createNamedParameter($recordUid, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('stage_id', $queryBuilder->createNamedParameter($stageId, Connection::PARAM_INT)),
            )
            ->executeQuery();

        $state = [];
        while ($row = $result->fetchAssociative()) {
            $state[(int)$row['checklist_item_uid']] = (int)$row['checked'] === 1;
        }

        return $state;
    }

    /**
     * Persist the final checklist snapshot for a stage (e.g. after Send to Stage).
     *
     * @param list<array{id?: int, uid?: int, checked?: bool|int}> $items
     */
    public function saveStateSnapshot(
        int $workspaceId,
        string $tableName,
        int $recordUid,
        int $stageId,
        array $items,
        int $beUserId
    ): void {
        if ($tableName === '' || $recordUid <= 0) {
            return;
        }

        $previousItems = $this->getItemsWithState($workspaceId, $tableName, $recordUid, $stageId);
        $normalized = $this->normalizeItems($items);
        $now = time();

        foreach ($normalized as $item) {
            $this->upsertCheckedState(
                $workspaceId,
                $tableName,
                $recordUid,
                $stageId,
                $item['id'],
                $item['checked'],
                $beUserId,
                $now
            );
        }

        $this->writeActivityEntry(
            $tableName,
            $recordUid,
            $workspaceId,
            $stageId,
            $beUserId,
            $this->formatChecklistSummary($previousItems),
            $this->formatChecklistSummary($this->withTitles($normalized))
        );
    }

    /**
     * Toggle a single checklist item and write an Activity (stage-change) entry.
     */
    public function toggleItem(
        int $workspaceId,
        string $tableName,
        int $recordUid,
        int $stageId,
        int $checklistItemUid,
        bool $checked,
        int $beUserId
    ): void {
        if ($tableName === '' || $recordUid <= 0 || $checklistItemUid <= 0) {
            return;
        }

        $previousState = $this->getState($workspaceId, $tableName, $recordUid, $stageId);
        $wasChecked = $previousState[$checklistItemUid] ?? false;

        $this->upsertCheckedState(
            $workspaceId,
            $tableName,
            $recordUid,
            $stageId,
            $checklistItemUid,
            $checked,
            $beUserId,
            time()
        );

        $titles = $this->checklistTemplateService->getTitlesByUids([$checklistItemUid]);
        $title = $titles[$checklistItemUid] ?? ('#' . $checklistItemUid);
        $this->writeActivityEntry(
            $tableName,
            $recordUid,
            $workspaceId,
            $stageId,
            $beUserId,
            $this->formatItemActivityLabel($wasChecked, $title),
            $this->formatItemActivityLabel($checked, $title)
        );
    }

    /**
     * Build items+checked for a stage, merging templates with stored state.
     *
     * @return list<array{id: int, title: string, checked: bool}>
     */
    public function getItemsWithState(
        int $workspaceId,
        string $tableName,
        int $recordUid,
        int $stageId
    ): array {
        $templates = $this->checklistTemplateService->getChecklistForStage($stageId, $workspaceId);
        $state = $this->getState($workspaceId, $tableName, $recordUid, $stageId);
        $items = [];
        foreach ($templates as $template) {
            $id = (int)$template['id'];
            $items[] = [
                'id' => $id,
                'title' => $template['title'],
                'checked' => $state[$id] ?? false,
            ];
        }

        return $items;
    }

    private function upsertCheckedState(
        int $workspaceId,
        string $tableName,
        int $recordUid,
        int $stageId,
        int $checklistItemUid,
        bool $checked,
        int $beUserId,
        int $now
    ): void {
        $connection = $this->connectionPool->getConnectionForTable(self::STATE_TABLE);
        $checkedInt = $checked ? 1 : 0;
        $affected = $connection->update(
            self::STATE_TABLE,
            [
                'checked' => $checkedInt,
                'tstamp' => $now,
                'cruser_id' => $beUserId,
            ],
            [
                'workspace_id' => $workspaceId,
                'table_name' => $tableName,
                'record_uid' => $recordUid,
                'stage_id' => $stageId,
                'checklist_item_uid' => $checklistItemUid,
            ]
        );
        if ($affected === 0) {
            $connection->insert(self::STATE_TABLE, [
                'pid' => 0,
                'tstamp' => $now,
                'crdate' => $now,
                'workspace_id' => $workspaceId,
                'table_name' => $tableName,
                'record_uid' => $recordUid,
                'stage_id' => $stageId,
                'checklist_item_uid' => $checklistItemUid,
                'checked' => $checkedInt,
                'cruser_id' => $beUserId,
            ]);
        }
    }

    /**
     * @param array<int|string, mixed> $items
     * @return list<array{id: int, checked: bool}>
     */
    private function normalizeItems(array $items): array
    {
        $normalized = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $id = (int)($item['id'] ?? $item['uid'] ?? 0);
            if ($id <= 0) {
                continue;
            }
            $normalized[] = [
                'id' => $id,
                'checked' => (bool)($item['checked'] ?? false),
            ];
        }

        return $normalized;
    }

    /**
     * @param list<array{id: int, checked: bool}> $items
     * @return list<array{id: int, title: string, checked: bool}>
     */
    private function withTitles(array $items): array
    {
        $titles = $this->checklistTemplateService->getTitlesByUids(array_column($items, 'id'));
        $payload = [];
        foreach ($items as $item) {
            $payload[] = [
                'id' => $item['id'],
                'title' => $titles[$item['id']] ?? ('#' . $item['id']),
                'checked' => $item['checked'],
            ];
        }

        return $payload;
    }

    private function formatItemActivityLabel(bool $checked, string $title): string
    {
        return ($checked ? 'Checked: ' : 'Unchecked: ') . $title;
    }

    /**
     * @param list<array{title?: string, checked?: bool}> $items
     */
    private function formatChecklistSummary(array $items): string
    {
        if ($items === []) {
            return '';
        }
        $checked = [];
        $unchecked = [];
        foreach ($items as $item) {
            $title = (string)($item['title'] ?? '');
            if ($title === '') {
                continue;
            }
            if (!empty($item['checked'])) {
                $checked[] = $title;
            } else {
                $unchecked[] = $title;
            }
        }
        $parts = [];
        if ($checked !== []) {
            $parts[] = 'Checked: ' . implode(', ', $checked);
        }
        if ($unchecked !== []) {
            $parts[] = 'Unchecked: ' . implode(', ', $unchecked);
        }

        return implode('; ', $parts);
    }

    /**
     * Write an Activity entry using ACTION_STAGECHANGE (same as stage moves).
     * current/next use the checklist stage; the comment carries the audit text.
     */
    private function writeActivityEntry(
        string $tableName,
        int $recordUid,
        int $workspaceId,
        int $stageId,
        int $beUserId,
        string $oldValue,
        string $newValue
    ): void {
        if ($oldValue === $newValue || $newValue === '') {
            return;
        }

        $backendUser = $this->getBackendUser();
        $originalUserId = $backendUser instanceof BackendUserAuthentication
            ? $backendUser->getOriginalUserIdWhenInSwitchUserMode()
            : null;

        $historyStore = GeneralUtility::makeInstance(
            RecordHistoryStore::class,
            RecordHistoryStore::USER_BACKEND,
            $beUserId,
            $originalUserId,
            $GLOBALS['EXEC_TIME'] ?? time(),
            $workspaceId
        );

        $historyStore->changeStageForRecord($tableName, $recordUid, [
            'current' => $stageId,
            'next' => $stageId,
            'comment' => $newValue,
            'recipients' => [],
        ]);
    }

    private function getBackendUser(): ?BackendUserAuthentication
    {
        $user = $GLOBALS['BE_USER'] ?? null;

        return $user instanceof BackendUserAuthentication ? $user : null;
    }
}
