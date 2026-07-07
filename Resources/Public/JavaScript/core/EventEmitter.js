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
 * Minimal event emitter for the workspace board's custom events.
 */
export class EventEmitter {
    events;
    constructor() {
        this.events = {};
    }
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return this;
    }
    off(event, callback) {
        if (!this.events[event])
            return this;
        if (!callback) {
            delete this.events[event];
            return this;
        }
        this.events[event] = this.events[event].filter((cb) => cb !== callback);
        return this;
    }
    emit(event, ...args) {
        if (!this.events[event])
            return this;
        this.events[event].forEach((callback) => {
            try {
                callback.apply(this, args);
            }
            catch (error) {
                console.error(`Event callback error for ${event}:`, error);
            }
        });
        return this;
    }
}
