import { html, nothing, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import { destroyCommentRte, mountCommentRte, type CommentRteHandle } from '@web-vision/kanban-workspaces/rte/CommentRte.js';
import { extractMentionsFromHtml } from '@web-vision/kanban-workspaces/mention/MentionFeed.js';
import type { Stage } from '@web-vision/kanban-workspaces/types.js';

export interface SendToStageContext {
  url: string;
  executeMethod: string;
  cardIds: (string | number)[];
  targetStage: (Stage & { checklist?: any[] }) | null;
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
      void this.ensureCommentRte(this.formData?.comments?.value || '');
    }
    if (changed.has('open') && !this.open) {
      this.teardownCommentRte();
    }
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
    // Only put emails into additional when the user was not already a checkbox recipient.
    const checkboxEmails = new Set<string>();
    this.querySelectorAll<HTMLInputElement>('.t3js-workspace-recipient').forEach((cb) => {
      // label often contains email; we rely on mention directory emails for additional only.
      if (recipientSet.has(cb.value)) {
        checkboxEmails.add(cb.value);
      }
    });
    const additionalOnly = mergedEmails.filter((email) => {
      // If this email belongs to a checked recipient uid we already notify via core path.
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

    this.emit('send-submit', {
      comments,
      additional,
      recipients: Array.from(recipientSet),
      willNotifyCount: willNotify.length,
    });
  }

  private checklistItems(): any[] {
    const raw = this.context?.targetStage?.checklist || [];
    const seen = new Set<string>();
    return raw.filter((item: any) => {
      const key = String(item.id ?? item.uid ?? item.title ?? '');
      if (!item.title || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
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
                <div class="form-group stage-checklist-section" style="display: block;">
                  <label class="form-label">Checklist</label>
                  <ul class="stage-checklist-ul">
                    ${checklist.map((item: any) => html`
                      <li class="stage-checklist-item">
                        <span class="stage-checklist-item-icon">
                          <typo3-backend-icon identifier="kanban-workspaces-stage-checklist" size="small"></typo3-backend-icon>
                        </span>${item.title}
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
