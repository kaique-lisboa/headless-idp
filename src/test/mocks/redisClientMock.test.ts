import { RedisClientType } from "@redis/client";

// Mock interface that matches the methods we actually use
export interface RedisClientMockInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<string>;
  ttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  connect(): Promise<any>;
  disconnect(): Promise<void>;
  on(event: string, callback: (...args: any[]) => void): any;
}

export class RedisClientMock implements RedisClientMockInterface {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, options?: { EX?: number }): Promise<string> {
    const expiresAt = options?.EX ? Date.now() + (options.EX * 1000) : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item || !item.expiresAt) return -1;

    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;

    item.expiresAt = Date.now() + (seconds * 1000);
    return 1;
  }

  async connect(): Promise<any> {
    // Mock connection - return self to match Redis client behavior
    return this;
  }

  async disconnect(): Promise<void> {
    this.store.clear();
  }

  // Mock event handlers
  on(event: string, callback: (...args: any[]) => void): any {
    // Mock event handling - return self to match Redis client behavior
    return this;
  }

  // Helper method to clear all data (useful for test cleanup)
  clear(): void {
    this.store.clear();
  }

  // Helper method to set data directly (useful for test setup)
  setData(key: string, value: string, expiresInSeconds?: number): void {
    const expiresAt = expiresInSeconds ? Date.now() + (expiresInSeconds * 1000) : undefined;
    this.store.set(key, { value, expiresAt });
  }

  // Helper method to get all stored keys (useful for debugging)
  getKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

// Factory function to create a mock Redis client
export function createRedisClientMock(): RedisClientMock {
  console.log("Creating RedisClientMock");
  return new RedisClientMock();
}

// Default mock instance
export const redisClientMock = createRedisClientMock();

// Type assertion helper for when you need to pass the mock as RedisClientType
export function asRedisClient(mock: RedisClientMock): RedisClientType {
  return mock as unknown as RedisClientType;
}
