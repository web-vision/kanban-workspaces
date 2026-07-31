/**
 * Mounts TYPO3 CKEditor 5 (`typo3-rte-ckeditor-ckeditor5`) into a stable host
 * element (`[data-rte-for="<id>"]`) and injects the @mention feed.
 *
 * The host is owned by Lit; the textarea + CKEditor node tree is created
 * imperatively so Lit re-renders do not tear down the editor.
 */

import { createMentionFeed, mentionItemRenderer } from '@web-vision/kanban-workspaces/mention/MentionFeed.js';

export interface CommentRteHandle {
  getData: () => string;
  setData: (html: string) => void;
  destroy: () => void;
}

function getBaseOptions(): Record<string, unknown> {
  const rte = window.WorkspaceConfig?.rte?.editor || {};
  try {
    return JSON.parse(JSON.stringify(rte));
  } catch {
    return { ...(rte as Record<string, unknown>) };
  }
}

function ensureMentionPlugins(options: Record<string, unknown>): void {
  const required = [
    { module: '@ckeditor/ckeditor5-list', exports: ['List'] },
    { module: '@ckeditor/ckeditor5-link', exports: ['Link'] },
    { module: '@ckeditor/ckeditor5-mention', exports: ['Mention'] },
  ];
  const existing = Array.isArray(options.importModules) ? [...(options.importModules as any[])] : [];
  for (const plugin of required) {
    const found = existing.some((entry) => {
      if (typeof entry === 'string') {
        return entry === plugin.module;
      }
      return entry?.module === plugin.module;
    });
    if (!found) {
      existing.push(plugin);
    }
  }
  options.importModules = existing;
}

function findHost(textareaId: string): HTMLElement | null {
  return document.querySelector(`[data-rte-for="${CSS.escape(textareaId)}"]`);
}

/**
 * Mount CKEditor into `[data-rte-for="<textareaId>"]`.
 */
export async function mountCommentRte(textareaId: string, initialHtml: string = ''): Promise<CommentRteHandle | null> {
  await import('@typo3/rte-ckeditor/ckeditor5.js');

  const hostContainer = findHost(textareaId);
  if (!hostContainer) {
    return null;
  }

  const existingHost = hostContainer.querySelector('typo3-rte-ckeditor-ckeditor5') as any;
  if (existingHost?.__kanbanRteHandle) {
    const handle = existingHost.__kanbanRteHandle as CommentRteHandle;
    if (initialHtml) {
      handle.setData(initialHtml);
    }
    return handle;
  }

  // Clear any previous broken markup from a prior Lit pass.
  hostContainer.replaceChildren();

  const textarea = document.createElement('textarea');
  textarea.id = textareaId;
  textarea.className = 'form-control';
  textarea.rows = 4;
  textarea.placeholder = 'Add a comment... Use @ to mention';
  textarea.value = initialHtml || '';
  textarea.setAttribute('slot', 'textarea');

  const editorHost = document.createElement('typo3-rte-ckeditor-ckeditor5') as any;
  editorHost.id = `${textareaId}-ckeditor5`;

  const options = getBaseOptions();
  ensureMentionPlugins(options);
  options.mention = {
    feeds: [
      {
        marker: '@',
        feed: createMentionFeed(),
        itemRenderer: mentionItemRenderer,
        minimumCharacters: 0,
        dropdownLimit: 20,
      },
    ],
  };
  // Property assignment keeps the feed function (JSON attributes cannot).
  editorHost.options = options;

  editorHost.appendChild(textarea);
  hostContainer.appendChild(editorHost);

  const handle: CommentRteHandle = {
    getData: () => (textarea.value || '').trim(),
    setData: (html: string) => {
      textarea.value = html || '';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    },
    destroy: () => {
      try {
        hostContainer.replaceChildren();
      } catch {
        // ignore
      }
      delete editorHost.__kanbanRteHandle;
    },
  };

  editorHost.__kanbanRteHandle = handle;
  return handle;
}

export function destroyCommentRte(textareaId: string): void {
  const hostContainer = findHost(textareaId);
  const editorHost = hostContainer?.querySelector('typo3-rte-ckeditor-ckeditor5') as any;
  if (editorHost?.__kanbanRteHandle) {
    (editorHost.__kanbanRteHandle as CommentRteHandle).destroy();
  } else if (hostContainer) {
    hostContainer.replaceChildren();
  }
}
