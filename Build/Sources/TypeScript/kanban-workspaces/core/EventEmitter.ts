/**
 * Minimal event emitter for the workspace board's custom events.
 */
export class EventEmitter {
  events: Record<string, Array<(...args: any[]) => void>>;

  constructor() {
    this.events = {}
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
    return this
  }

  off(event, callback) {
    if (!this.events[event]) return this

    if (!callback) {
      delete this.events[event]
      return this
    }

    this.events[event] = this.events[event].filter((cb) => cb !== callback)
    return this
  }

  emit(event, ...args) {
    if (!this.events[event]) return this

    this.events[event].forEach((callback) => {
      try {
        callback.apply(this, args)
      } catch (error) {
        console.error(`Event callback error for ${event}:`, error)
      }
    })
    return this
  }
}
