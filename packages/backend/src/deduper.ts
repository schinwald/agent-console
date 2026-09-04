export class SubmissionDeduper {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs = 60_000) {}

  isDuplicate(eventId: string, now = Date.now()): boolean {
    for (const [id, timestamp] of this.seen) {
      if (now - timestamp > this.ttlMs) this.seen.delete(id);
    }
    if (this.seen.has(eventId)) return true;
    this.seen.set(eventId, now);
    return false;
  }
}
