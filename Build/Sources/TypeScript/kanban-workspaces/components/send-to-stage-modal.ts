import { html, nothing, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import { destroyCommentRte, mountCommentRte, type CommentRteHandle } from '@web-vision/kanban-workspaces/rte/CommentRte.js';
import { extractMentionsFromHtml } from '@web-vision/kanban-workspaces/mention/MentionFeed.js';
import type { Stage } from '@web-vision/kanban-workspaces/types.js';

export interface ChecklistItemView {
  id: number;
  title: string;
  checked?: boolean;
}

export interface SendToStageContext {
  url: string;
  executeMethod: string;
  cardIds: (string | number)[];
  targetStage: (Stage & { checklist?: ChecklistItemView[] }) | null;
  sourceStage?: Stage | null;
  isDragDrop: boolean;
}

/**
 * "Send to stage" modal. Presents the recipients / checklist / comments form
 * built from the TYPO3 window response and emits `send-submit` with the
 * collected values (or `send-cancel`). All persistence is done by the board.
 */
@customElement('typo3-kanban-send-to-stage-modal')
export class KanbanSendToStageModalElement extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) formData: any = null;
  @property({ attribute: false }) context: SendToStageContext | null = null;
  @property({ type: Boolean }) pending = false;

  @state() private checklistState: Record<number, boolean> = {};
  private commentRte: CommentRteHandle | null = null;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('open') && this.open) {
      const additional = this.querySelector<HTMLTextAreaElement>('#stageAdditionalRecipients');
      if (additional) {
        additional.value = this.formData?.additional?.value || '';
      }
      this.seedChecklistState();
      void this.ensureCommentRte(this.formData?.comments?.value || '');
    }
    if (changed.has('context') && this.open) {
      this.seedChecklistState();
    }
    if (changed.has('open') && !this.open) {
      this.teardownCommentRte();
    }
  }

  private seedChecklistState(): void {
    const next: Record<number, boolean> = {};
    for (const item of this.checklistItems()) {
      next[item.id] = !!item.checked;
    }
    this.checklistState = next;
  }

  private async ensureCommentRte(initialHtml: string): Promise<void> {
    this.teardownCommentRte();
    await this.updateComplete;
    requestAnimationFrame(async () => {
      this.commentRte = await mountCommentRte('stageComments', initialHtml);
    });
  }

  private teardownCommentRte(): void {
    destroyCommentRte('stageComments');
    this.commentRte = null;
  }

  private emit(type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private onOverlayClick(e: Event): void {
    if ((e.target as HTMLElement).id === 'sendToStageModal') {
      this.emit('send-cancel');
    }
  }

  private submit(): void {
    const comments = this.commentRte?.getData()
      || this.querySelector<HTMLTextAreaElement>('#stageComments')?.value
      || '';
    let additional = this.querySelector<HTMLTextAreaElement>('#stageAdditionalRecipients')?.value || '';
    const recipients = Array.from(
      this.querySelectorAll<HTMLInputElement>('.t3js-workspace-recipient:checked'),
    ).map((cb) => cb.value);

    // Auto-check recipients / append emails from @mentions.
    const { userIds, emails } = extractMentionsFromHtml(comments);
    const recipientSet = new Set(recipients);
    this.querySelectorAll<HTMLInputElement>('.t3js-workspace-recipient').forEach((cb) => {
      if (userIds.includes(Number(cb.value)) && !cb.disabled) {
        cb.checked = true;
        recipientSet.add(cb.value);
      }
    });

    const existingAdditional = additional
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const mergedEmails = Array.from(new Set([...existingAdditional, ...emails]));
    const additionalOnly = mergedEmails.filter((email) => {
      const matchedUser = (window.WorkspaceConfig?.mentionDirectory?.users || [])
        .find((u: any) => u.email === email);
      if (matchedUser && recipientSet.has(String(matchedUser.uid))) {
        return false;
      }
      return true;
    });
    additional = additionalOnly.join('\n');

    const willNotify = [
      ...Array.from(recipientSet),
      ...additionalOnly,
    ];

    const checklist = this.checklistItems().map((item) => ({
      id: item.id,
      checked: !!this.checklistState[item.id],
    }));

    this.emit('send-submit', {
      comments,
      additional,
      recipients: Array.from(recipientSet),
      willNotifyCount: willNotify.length,
      checklist,
    });
  }

  private checklistItems(): ChecklistItemView[] {
    const raw = this.context?.targetStage?.checklist || [];
    const seen = new Set<string>();
    return raw.filter((item: any) => {
      const id = Number(item.id ?? item.uid ?? 0);
      const key = String(id || item.title || '');
      if (!item.title || id <= 0 || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }).map((item: any) => ({
      id: Number(item.id ?? item.uid),
      title: String(item.title),
      checked: !!item.checked,
    }));
  }

  private onChecklistChange(itemId: number, checked: boolean): void {
    this.checklistState = { ...this.checklistState, [itemId]: checked };
  }

  protected override render(): TemplateResult {
    const formData = this.formData || {};
    const targetStage = this.context?.targetStage;
    const recipients: any[] = formData.sendMailTo || [];
    const checklist = this.checklistItems();
    const count = this.context?.cardIds?.length || 1;

    return html`
      <div class="modal-overlay" id="sendToStageModal" style=${`display: ${this.open ? 'flex' : 'none'}`}
        @click=${(e: Event) => this.onOverlayClick(e)}>
        <div class="modal modal-dialog modal-xl" role="dialog" aria-modal="true">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title-section">
                <h4 class="modal-title">Send to Stage</h4>
              </div>
              <button class="modal-close btn-close" aria-label="Close" @click=${() => this.emit('send-cancel')}>
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="modal-body">
              ${targetStage ? html`
                <div class="stage-info-banner" style="display: flex;">
                  <i class="fas fa-info-circle"></i>
                  <span>Sending ${count > 1 ? `${count} items` : 'item'} to ${targetStage.label}</span>
                </div>` : nothing}

              ${checklist.length > 0 ? html`
                <div class="form-group stage-checklist-section stage-checklist-list" style="display: block;">
                  <label class="form-label">Checklist</label>
                  <p class="form-text">Checking items is optional</p>
                  <ul class="stage-checklist-ul" role="list">
                    ${checklist.map((item) => html`
                      <li class="stage-checklist-item">
                        <label class="stage-checklist-item-label" for=${`stageChecklist-${item.id}`}>
                          <input type="checkbox"
                            class="stage-checklist-checkbox"
                            id=${`stageChecklist-${item.id}`}
                            .checked=${!!this.checklistState[item.id]}
                            @change=${(e: Event) => this.onChecklistChange(item.id, (e.target as HTMLInputElement).checked)}>
                          <span class="stage-checklist-item-title">${item.title}</span>
                        </label>
                      </li>`)}
                  </ul>
                </div>` : nothing}

              ${recipients.length > 0 ? html`
                <div class="form-group" id="recipientsGroup">
                  <label class="form-label">Recipients</label>
                  <div class="stage-recipients">
                    ${recipients.map((recipient: any) => html`
                      <div class="stage-recipient">
                        <input type="checkbox" class="t3js-workspace-recipient" id=${recipient.name}
                          value=${recipient.value} ?checked=${recipient.checked} ?disabled=${recipient.disabled}>
                        <label for=${recipient.name}>${recipient.label}</label>
                      </div>`)}
                  </div>
                </div>` : nothing}

              ${formData.additional ? html`
                <div class="form-group" id="additionalRecipientsGroup">
                  <label for="stageAdditionalRecipients" class="form-label">Additional recipients</label>
                  <textarea class="form-control" id="stageAdditionalRecipients" rows="2"
                    placeholder="One recipient per line (or @mention coworkers in the comment)"></textarea>
                  <div class="form-text">One recipient per line — prefer @mentions in the comment</div>
                </div>` : nothing}

              <div class="form-group">
                <label class="form-label" id="stageCommentsLabel">Comments</label>
                <div class="kanban-rte-host" data-rte-for="stageComments" aria-labelledby="stageCommentsLabel"></div>
              </div>
            </div>

            <div class="modal-footer">
              <div class="modal-actions-left"></div>
              <div class="modal-actions-right">
                <button class="btn btn-outline" @click=${() => this.emit('send-cancel')}>Cancel</button>
                <button class="btn btn-primary" ?disabled=${this.pending} @click=${() => this.submit()}>
                  <i class="fas ${this.pending ? 'fa-spinner fa-spin' : 'fa-check'}"></i> Send to Stage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-send-to-stage-modal': KanbanSendToStageModalElement;
  }
}
