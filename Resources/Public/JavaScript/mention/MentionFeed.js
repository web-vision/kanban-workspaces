/*
 * This file is part of the web-vision/kanban_workspaces TYPO3 extension.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2 of the
 * License, or any later version.
 *
 * Generated from Build/Sources/TypeScript/ - do not edit directly, change the
 * TypeScript source and re-run "npm run build:js" instead.
 */
/**
 * CKEditor Mention feed backed by the mention-suggest AJAX endpoint
 * (with an in-memory workspace directory seed for instant local filtering).
 */
function getConfig() {
    return window.WorkspaceConfig || {};
}
function getSeedItems() {
    const config = getConfig();
    const directory = config.mentionDirectory || {};
    const directoryUsers = (directory.users || []);
    const directoryGroups = (directory.groups || []);
    // Merge independently: an empty users list must not drop groups (and vice versa).
    const users = directoryUsers.length > 0
        ? directoryUsers
        : (config.beUsers || []).map((user) => ({
            id: `@user:${user.uid}`,
            text: `@${user.username}`,
            type: 'user',
            uid: user.uid,
            username: user.username,
        }));
    return [...users, ...directoryGroups];
}
function filterLocal(query) {
    const needle = query.trim().toLowerCase();
    const items = getSeedItems();
    const users = items.filter((item) => item.type === 'user');
    const groups = items.filter((item) => item.type === 'group');
    const match = (item) => {
        if (!needle) {
            return true;
        }
        const haystack = [item.text, item.username, item.email, item.role, item.text.replace(/^@/, '')]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(needle);
    };
    const matchedUsers = users.filter(match).slice(0, 12);
    const matchedGroups = groups.filter(match).slice(0, 8);
    return [...matchedUsers, ...matchedGroups];
}
async function fetchRemote(query) {
    const url = getConfig().ajaxUrls?.mentionSuggest
        || window.TYPO3?.settings?.ajaxUrls?.kanban_workspace_mention_suggest;
    if (!url) {
        return filterLocal(query);
    }
    const workspaceId = getConfig().workspaceId || 0;
    const endpoint = new URL(url, window.location.origin);
    endpoint.searchParams.set('q', query);
    endpoint.searchParams.set('workspace', String(workspaceId));
    try {
        const response = await fetch(endpoint.toString(), {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        });
        if (!response.ok) {
            return filterLocal(query);
        }
        const payload = await response.json();
        if (payload?.success && Array.isArray(payload.items)) {
            return payload.items;
        }
    }
    catch (error) {
        console.warn('Mention suggest failed, falling back to local directory', error);
    }
    return filterLocal(query);
}
/**
 * CKEditor mention feed callback.
 * Prefer the seeded workspace directory synchronously so the balloon opens
 * immediately. If the seed has users but no groups, enrich via Ajax.
 */
export function createMentionFeed() {
    return (queryText) => {
        const local = filterLocal(queryText || '');
        const hasGroups = local.some((item) => item.type === 'group');
        const canFetch = !!getConfig().ajaxUrls?.mentionSuggest;
        if ((local.length > 0 && hasGroups) || !canFetch) {
            return local;
        }
        // Empty seed, or users-only fallback without groups → load full directory.
        return fetchRemote(queryText || '');
    };
}
/**
 * Custom list item renderer for the Mention balloon.
 * Must return a non-interactive element (CKEditor wraps it in a button).
 */
export function mentionItemRenderer(item) {
    const row = document.createElement('span');
    row.className = 'kanban-mention-item';
    const avatar = document.createElement('span');
    avatar.className = 'kanban-mention-item__avatar';
    if (item.type === 'group') {
        avatar.textContent = 'G';
    }
    else if (item.avatarUrl) {
        const img = document.createElement('img');
        img.src = item.avatarUrl;
        img.alt = '';
        avatar.appendChild(img);
    }
    else {
        const label = (item.username || item.text || '?').replace(/^@/, '');
        avatar.textContent = label.slice(0, 2).toUpperCase();
    }
    const meta = document.createElement('span');
    meta.className = 'kanban-mention-item__meta';
    const name = document.createElement('span');
    name.className = 'kanban-mention-item__name';
    name.textContent = item.text;
    meta.appendChild(name);
    const detail = document.createElement('span');
    detail.className = 'kanban-mention-item__detail';
    if (item.type === 'group') {
        detail.textContent = `Group${item.memberCount != null ? ` · ${item.memberCount} members` : ''}`;
    }
    else {
        detail.textContent = [item.role, item.email].filter(Boolean).join(' · ');
    }
    meta.appendChild(detail);
    row.appendChild(avatar);
    row.appendChild(meta);
    return row;
}
const MENTION_ID_PATTERN = /^@(user|group):(\d+)$/;
function parseMentionNodes(html) {
    if (!html) {
        return [];
    }
    const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
    const mentions = [];
    doc.querySelectorAll('[data-mention]').forEach((node) => {
        const match = (node.getAttribute('data-mention') || '').match(MENTION_ID_PATTERN);
        if (!match) {
            return;
        }
        const uid = Number(match[2]);
        if (uid < 1) {
            return;
        }
        mentions.push({ type: match[1], uid });
    });
    return mentions;
}
/**
 * Extract mention user/group ids and emails from comment HTML for stage recipient merge.
 * Group mentions expand to member user IDs (for recipient selection).
 */
export function extractMentionsFromHtml(html) {
    const userIds = [];
    const emails = [];
    const groupIds = [];
    const directory = getSeedItems();
    const pushUser = (uid) => {
        if (uid < 1 || userIds.includes(uid)) {
            return;
        }
        userIds.push(uid);
        const item = directory.find((d) => d.type === 'user' && d.uid === uid);
        if (item?.email) {
            emails.push(item.email);
        }
    };
    parseMentionNodes(html).forEach(({ type, uid }) => {
        if (type === 'user') {
            pushUser(uid);
            return;
        }
        if (!groupIds.includes(uid)) {
            groupIds.push(uid);
        }
        const group = directory.find((d) => d.type === 'group' && d.uid === uid);
        (group?.memberUserIds || []).forEach((memberId) => pushUser(memberId));
    });
    return { userIds, emails: Array.from(new Set(emails)), groupIds };
}
/**
 * Extract unique user/group mentions for Watchers display (groups are not expanded to members).
 */
export function extractWatcherMentionsFromHtml(html) {
    const userIds = [];
    const groupIds = [];
    parseMentionNodes(html).forEach(({ type, uid }) => {
        if (type === 'user' && !userIds.includes(uid)) {
            userIds.push(uid);
        }
        if (type === 'group' && !groupIds.includes(uid)) {
            groupIds.push(uid);
        }
    });
    const directory = getSeedItems();
    const resolve = (type, uid) => {
        const item = directory.find((d) => d.type === type && d.uid === uid);
        return item || {
            id: `@${type}:${uid}`,
            text: `@${type}:${uid}`,
            type,
            uid,
        };
    };
    return {
        users: userIds.map((uid) => resolve('user', uid)),
        groups: groupIds.map((uid) => resolve('group', uid)),
    };
}
/**
 * Sanitize comment HTML for display (allowlist aligned with core default RTE).
 * Preserves semantic formatting; keeps safe class names and mention chips.
 */
export function sanitizeCommentHtml(html) {
    const trimmed = (html || '').trim();
    if (!trimmed) {
        return '';
    }
    // Escaped HTML from older plain-text storage → decode once, then sanitize.
    let source = trimmed;
    if (!/<[a-z][\s\S]*>/i.test(source) && /&lt;[a-z]/i.test(source)) {
        const ta = document.createElement('textarea');
        ta.innerHTML = source;
        source = ta.value;
    }
    if (!source.includes('<')) {
        const escaped = source
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<p>${escaped}</p>`;
    }
    const doc = new DOMParser().parseFromString(`<div id="root">${source}</div>`, 'text/html');
    const root = doc.getElementById('root');
    if (!root) {
        return '';
    }
    const allowed = new Set([
        'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SUB', 'SUP',
        'UL', 'OL', 'LI',
        'A', 'SPAN', 'SMALL',
        'H2', 'H3', 'H4', 'PRE', 'CODE', 'BLOCKQUOTE', 'HR',
        'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'CAPTION',
        'FIGURE', 'FIGCAPTION',
    ]);
    const safeClass = (value) => value
        .split(/\s+/)
        .filter((token) => /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(token))
        .slice(0, 12)
        .join(' ');
    const walk = (node) => {
        const children = Array.from(node.childNodes);
        for (const child of children) {
            if (child.nodeType === Node.TEXT_NODE) {
                continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE) {
                node.removeChild(child);
                continue;
            }
            const el = child;
            if (!allowed.has(el.tagName)) {
                while (el.firstChild) {
                    node.insertBefore(el.firstChild, el);
                }
                node.removeChild(el);
                walk(node);
                return;
            }
            const href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
            const title = el.getAttribute('title') || '';
            const mention = el.tagName === 'SPAN' ? (el.getAttribute('data-mention') || '') : '';
            const className = safeClass(el.getAttribute('class') || '');
            [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
            if (className) {
                el.setAttribute('class', className);
            }
            if (el.tagName === 'A') {
                if (href && !/^\s*(javascript|data|vbscript):/i.test(href)) {
                    el.setAttribute('href', href);
                }
                if (title) {
                    el.setAttribute('title', title);
                }
                el.setAttribute('rel', 'noopener noreferrer');
            }
            else if (el.tagName === 'SPAN' && MENTION_ID_PATTERN.test(mention)) {
                el.setAttribute('data-mention', mention);
                el.className = className.includes('mention') ? className : `${className} mention`.trim();
            }
            walk(el);
        }
    };
    walk(root);
    return root.innerHTML;
}
