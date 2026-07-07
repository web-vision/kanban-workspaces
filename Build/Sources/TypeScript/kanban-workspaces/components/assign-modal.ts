import { html, nothing, LitElement, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Card, CardUser } from '@web-vision/kanban-workspaces/types.js';

declare const TYPO3: any;

/**
 * Assign-record modal: assigns a backend user (with title/description) to a
 * workspace record. Emits `assign-submit` with the form values or
 * `assign-cancel`; the board performs the AJAX persistence.
 */
@customElement('typo3-kanban-assign-modal')
export class KanbanAssignModalElement extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) card: Card | null = null;
  @property({ attribute: false }) beUsers: CardUser[] = [];

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private emit(type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private label(key: string, fallback: string): string {
    return (typeof TYPO3 !== 'undefined' && TYPO3.lang && TYPO3.lang[key]) || fallback;
  }

  private onOverlayClick(e: Event): void {
    if ((e.target as HTMLElement).id === 'assignModal') {
      this.emit('assign-cancel');
    }
  }

  private submit(): void {
    const root = this;
    const beUser = parseInt(root.querySelector<HTMLSelectElement>('[name="be_user"]')?.value || '0', 10);
    if (!beUser || beUser < 1) {
      this.emit('toast', { message: 'Please select an assignee', type: 'warning' });
      return;
    }
    this.emit('assign-submit', {
      title: (root.querySelector<HTMLInputElement>('[name="title"]')?.value || '').trim(),
      description: (root.querySelector<HTMLTextAreaElement>('[name="description"]')?.value || '').trim(),
      be_user: beUser,
    });
  }

  protected override render(): TemplateResult {
    const selectedUid = this.card?.assignee?.uid;
    return html`
      <div class="modal-overlay" id="assignModal" style=${`display: ${this.open ? 'flex' : 'none'}`}
        @click=${(e: Event) => this.onOverlayClick(e)}>
        <div class="modal modal-dialog modal-xl" role="dialog" aria-modal="true">
          <div class="modal-content">
            <div class="modal-header">
              <div class="modal-title-section">
                <h4 class="modal-title">${this.label('window.assign.title', 'Assign Record')}</h4>
              </div>
              <button class="modal-close btn-close" aria-label="Close" @click=${() => this.emit('assign-cancel')}>
                <i class="fas fa-times"></i>
              </button>
            </div>

            <div class="modal-body">
              <form class="t3js-assign-form">
                <div class="form-group">
                  <label class="form-label">${this.label('labels.title', 'Title')}</label>
                  <input type="text" name="title" class="form-control">
                </div>
                <div class="form-group">
                  <label class="form-label">${this.label('labels.description', 'Description')}</label>
                  <textarea name="description" class="form-control" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">${this.label('labels.assignee', 'Assignee (Backend user UID)')}</label>
                  <select name="be_user" class="form-select" required>
                    <option value="0"></option>
                    ${this.beUsers.map((user) => html`
                      <option value=${user.uid} ?selected=${selectedUid != null && String(user.uid) === String(selectedUid)}>
                        ${user.username} (${user.uid})
                      </option>`)}
                  </select>
                </div>
              </form>
            </div>

            <div class="modal-footer">
              <div class="modal-actions-left"></div>
              <div class="modal-actions-right">
                <button class="btn btn-outline" @click=${() => this.emit('assign-cancel')}>Cancel</button>
                <button class="btn btn-primary" @click=${() => this.submit()}>OK</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'typo3-kanban-assign-modal': KanbanAssignModalElement;
  }
}
