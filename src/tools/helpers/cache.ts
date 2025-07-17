// Generic in-memory cache utility for plug-and-play usage
export class SimpleCache<T = any> {
  private cache: Map<string, T> = new Map();
  private ttl: number; // ms
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(ttl: number = 5 * 60 * 1000) { // default 5 min
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: T): void {
    this.cache.set(key, value);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, this.ttl);
    this.timers.set(key, timer);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

