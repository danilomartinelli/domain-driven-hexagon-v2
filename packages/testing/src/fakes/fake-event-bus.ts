/**
 * Fake event bus for testing. Captures all published events
 * for assertion without requiring EventEmitter2.
 */
export class FakeEventBus {
  private events: Array<{ name: string; payload: unknown }> = [];

  async emitAsync(name: string, payload: unknown): Promise<void> {
    this.events.push({ name, payload });
  }

  /** Get all emitted events */
  getEmittedEvents(): Array<{ name: string; payload: unknown }> {
    return [...this.events];
  }

  /** Get events of a specific type */
  getEventsOfType(name: string): unknown[] {
    return this.events.filter((e) => e.name === name).map((e) => e.payload);
  }

  /** Check if an event of a specific type was emitted */
  hasEmitted(name: string): boolean {
    return this.events.some((e) => e.name === name);
  }

  /** Clear all captured events */
  clear(): void {
    this.events = [];
  }
}
