import { html, nothing, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
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

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  // Prefill the (uncontrolled) textareas once when the modal opens, so a later
  // re-render (e.g. the pending flag toggling) does not wipe user input.
  protected override updated(changed: PropertyValues): void {
    if (changed.has('open') && this.open) {
      const comments = this.querySelector<HTMLTextAreaElement>('#stageComments');
      if (comments) { comments.value = this.formData?.comments?.value || ''; }
      const additional = this.querySelector<HTMLTextAreaElement>('#stageAdditionalRecipients');
      if (additional) { additional.value = this.formData?.additional?.value || ''; }
    }
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
    const comments = this.querySelector<HTMLTextAreaElement>('#stageComments')?.value || '';
    const additional = this.querySelector<HTMLTextAreaElement>('#stageAdditionalRecipients')?.value || '';
    const recipients = Array.from(this.querySelectorAll<HTMLInputElement>('.t3js-workspace-recipient:checked')).map((cb) => cb.value);
    this.emit('send-submit', { comments, additional, recipients });
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
                    placeholder="One recipient per line"></textarea>
                  <div class="form-text">One recipient per line</div>
                </div>` : nothing}

              <div class="form-group">
                <label for="stageComments" class="form-label">Comments</label>
                <textarea class="form-control" id="stageComments" rows="4" placeholder="Add a comment..."></textarea>
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
