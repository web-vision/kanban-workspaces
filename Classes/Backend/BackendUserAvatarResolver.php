<?php

declare(strict_types=1);

namespace WebVision\KanbanWorkspaces\Backend;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Http\NormalizedParams;
use TYPO3\CMS\Core\Resource\ResourceFactory;

/**
 * Resolves the absolute URL of a backend user's avatar (FAL field `be_users.avatar`).
 */
final class BackendUserAvatarResolver
{
    public function __construct(
        private readonly ConnectionPool $connectionPool,
        private readonly ResourceFactory $resourceFactory,
    ) {
    }

    /**
     * Build the absolute avatar URL for the given backend user, or `null` when no
     * avatar reference is set or the FAL resource cannot be resolved.
     *
     * @param ServerRequestInterface|null $request Active request (preferred). Falls back to
     *                                             `$GLOBALS['TYPO3_REQUEST']` when omitted, which
     *                                             is the typical situation inside backend event
     *                                             listeners that do not receive the request through
     *                                             the event payload.
     */
    public function resolveAvatarUrl(int $beUserId, ?ServerRequestInterface $request = null): ?string
    {
        $referenceUid = $this->findAvatarReferenceUid($beUserId);
        if ($referenceUid === null) {
            return null;
        }
        try {
            $fileReference = $this->resourceFactory->getFileReferenceObject($referenceUid);
            $publicUrl = $fileReference->getPublicUrl();
        } catch (\Throwable) {
            return null;
        }
        if ($publicUrl === null) {
            return null;
        }
        return $this->getSiteUrl($request) . ltrim($publicUrl, '/');
    }

    /**
     * Look up the `sys_file_reference.uid` for the avatar attached to the given backend user.
     * Returns `null` when no non-deleted reference exists.
     */
    private function findAvatarReferenceUid(int $beUserId): ?int
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable('sys_file_reference');
        $row = $queryBuilder
            ->select('uid')
            ->from('sys_file_reference')
            ->where(
                $queryBuilder->expr()->eq('uid_foreign', $queryBuilder->createNamedParameter($beUserId, Connection::PARAM_INT)),
                $queryBuilder->expr()->eq('tablenames', $queryBuilder->createNamedParameter('be_users')),
                $queryBuilder->expr()->eq('fieldname', $queryBuilder->createNamedParameter('avatar')),
                $queryBuilder->expr()->eq('deleted', $queryBuilder->createNamedParameter(0, Connection::PARAM_INT))
            )
            ->setMaxResults(1)
            ->executeQuery()
            ->fetchAssociative();
        if ($row === false || empty($row['uid'])) {
            return null;
        }
        return (int)$row['uid'];
    }

    private function getSiteUrl(?ServerRequestInterface $request): string
    {
        $request ??= $GLOBALS['TYPO3_REQUEST'] ?? null;
        if (!$request instanceof ServerRequestInterface) {
            return '';
        }
        $normalizedParams = $request->getAttribute('normalizedParams');
        if (!$normalizedParams instanceof NormalizedParams) {
            return '';
        }
        return $normalizedParams->getSiteUrl();
    }
}
