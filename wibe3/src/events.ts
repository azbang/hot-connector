/**
 * Generic event emitter class for handling typed events and their callbacks
 * @template T Record type containing event names as keys and their payload types as values
 */
export class EventEmitter<T extends Record<string, any>> {
  /** Internal storage for event callbacks */
  private events: Partial<Record<keyof T, Array<(payload: any) => void>>> = {};

  /**
   * Subscribe to an event
   * @template K Event name type
   * @param event Name of the event to subscribe to
   * @param callback Function to be called when event is emitted
   */
  on<K extends keyof T>(event: K, callback: (payload: T[K]) => void): void {
    if (!this.events[event]) this.events[event] = [];
    this.events[event]!.push(callback);
  }

  /**
   * Emit an event with payload
   * @template K Event name type
   * @param event Name of the event to emit
   * @param payload Data to pass to event handlers
   */
  emit<K extends keyof T>(event: K, payload: T[K]): void {
    this.events[event]?.forEach((cb) => cb(payload));
  }

  /**
   * Unsubscribe from an event
   * @template K Event name type
   * @param event Name of the event to unsubscribe from
   * @param callback Function to remove from event handlers
   */
  off<K extends keyof T>(event: K, callback: (payload: T[K]) => void): void {
    this.events[event] = this.events[event]?.filter((cb) => cb !== callback);
  }

  /**
   * Subscribe to an event for a single emission
   * @template K Event name type
   * @param event Name of the event to subscribe to
   * @param callback Function to be called when event is emitted
   */
  once<K extends keyof T>(event: K, callback: (payload: T[K]) => void): void {
    const onceWrapper = (payload: T[K]) => {
      callback(payload);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Remove all event listeners
   * @template K Event name type
   * @param event Optional event name to remove listeners for. If not provided, removes all listeners for all events
   */
  removeAllListeners<K extends keyof T>(event?: K): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}
