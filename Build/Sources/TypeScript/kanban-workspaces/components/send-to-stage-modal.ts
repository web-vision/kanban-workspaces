import { html, nothing, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
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
      this.seedChecklistState();
    }
    if (changed.has('context') && this.open) {
      this.seedChecklistState();
    }
  }

  private seedChecklistState(): void {
    const next: Record<number, boolean> = {};
    for (const item of this.checklistItems()) {
      next[item.id] = !!item.checked;
    }
    this.checklistState = next;
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
    const checklist = this.checklistItems().map((item) => ({
      id: item.id,
      checked: !!this.checklistState[item.id],
    }));
    this.emit('send-submit', { comments, additional, recipients, checklist });
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
