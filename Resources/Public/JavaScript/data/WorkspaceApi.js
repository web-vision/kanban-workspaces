/**
 * Thin transport layer over the TYPO3 workspace AJAX dispatch endpoint.
 *
 * Responsible only for issuing requests and handing the raw response to the
 * board's {@link DataTransformer}; it does not touch the DOM. Reads its
 * endpoints and request payload from the owning board.
 */
export class WorkspaceApi {
  constructor(board) {
    this.board = board
  }

  // Fetch the workspace records for the current filter payload and map them to cards.
  fetchData() {
    const url = this.board.options.getDataApiUrl || this.board.options.apiUrl;

    if (!url) {
      console.error('No API URL configured');
      return Promise.reject(new Error('No API URL configured'));
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.board.apiPayload),
    })
      .then((response) => response.json())
      .then((apiResponse) => {
        // Convert the TYPO3 workspace data to kanban cards
        const cards = this.board.transformer.convertWorkspaceDataToCards(apiResponse);
        return {
          cards: cards,
          total: apiResponse[0]?.result?.total || cards.length
        };
      });
  }

  // Fetch comments / history / diff details for a single card and cache them on the board.
  fetchCardDetails(card) {
    const url = this.board.options.getDataApiUrl || this.board.options.apiUrl;

    if (!url) {
      console.error('No API URL configured');
      return Promise.reject(new Error('No API URL configured'));
    }

    const apiPayload = {
      action: "RemoteServer",
      method: "getRowDetails",
      data: [{
        stage: card.stage,
        t3ver_oid: card.t3ver_oid,
        table: card.table,
        uid: card.uid,
        filterFields: true
      }]
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    })
      .then((response) => response.json())
      .then((apiResponse) => {
        // Convert the TYPO3 workspace row data to kanban cards history and comments
        const details = this.board.transformer.convertCardDetailsToFormat(apiResponse, card.id);

        if (!this.board.data.comments) {
          this.board.data.comments = {};
        }
        if (!this.board.data.history) {
          this.board.data.history = {};
        }
        if (!this.board.data.diffs) {
          this.board.data.diffs = {};
        }

        this.board.data.comments[card.id] = details.comments;
        this.board.data.history[card.id] = details.history;
        this.board.data.diffs[card.id] = details.diff;

        return details;
      });
  }

  // Persist a module-data value (filter selection) via the user settings endpoint.
  processData(action, filterType, filterValue) {
    const url = this.board.options.getProcessApiUrl || this.board.options.apiUrl;

    if (!url) {
      console.error('No API URL configured');
      return Promise.reject(new Error('No API URL configured'));
    }

    const formData = new FormData();
    formData.append('action', action);
    formData.append(
      'key',
      `moduleData.web_kanbanworkspaces.${filterType}`
    );
    formData.append('value', filterValue);

    return fetch(url, {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then(() => {});
  }
}
