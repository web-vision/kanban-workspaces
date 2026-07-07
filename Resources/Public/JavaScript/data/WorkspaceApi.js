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
import { DataTransformer } from '@web-vision/kanban-workspaces/data/DataTransformer.js';
/**
 * Transport layer over the TYPO3 workspace AJAX dispatch endpoint. Stateless
 * apart from its configured endpoints and the pure {@link DataTransformer};
 * it issues requests and returns normalised view models, it does not touch the
 * DOM or hold board state.
 */
export class WorkspaceApi {
    constructor(dataUrl, processUrl) {
        this.dataUrl = dataUrl;
        this.processUrl = processUrl;
        this.transformer = new DataTransformer();
    }
    postJson(url, payload) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(payload),
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            return response.json();
        });
    }
    // Fetch the workspace records for the given dispatch payload and map to cards.
    async fetchData(apiPayload) {
        const apiResponse = await this.postJson(this.dataUrl, apiPayload);
        const cards = this.transformer.convertWorkspaceDataToCards(apiResponse);
        return { cards, total: apiResponse[0]?.result?.total || cards.length };
    }
    // Fetch comments / history / diff details for a single card.
    async fetchCardDetails(card) {
        const apiPayload = {
            action: 'RemoteServer',
            method: 'getRowDetails',
            data: [{ stage: card.stage, t3ver_oid: card.t3ver_oid, table: card.table, uid: card.uid, filterFields: true }],
        };
        const apiResponse = await this.postJson(this.dataUrl, apiPayload);
        return this.transformer.convertCardDetailsToFormat(apiResponse, card.id);
    }
    // Generic "Actions" dispatch call (view/delete/send-to-stage/add-comment).
    dispatch(payload) {
        return this.postJson(this.dataUrl, payload);
    }
    // Persist a module-data value (filter selection) via the user settings endpoint.
    processData(action, filterType, filterValue) {
        const formData = new FormData();
        formData.append('action', action);
        formData.append('key', `moduleData.web_kanbanworkspaces.${filterType}`);
        formData.append('value', filterValue);
        return fetch(this.processUrl, { method: 'POST', body: formData })
            .then((response) => response.json())
            .then(() => undefined);
    }
}
