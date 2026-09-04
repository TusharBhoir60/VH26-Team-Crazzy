import Redis from 'ioredis';
import { getRedisClient } from '../shared/redis.client';
import { DedupEntry } from './types';
import { Alert } from '../types/alert.types';

export class DedupRedisService {
  private client: Redis;

  constructor(customClient?: Redis) {
    this.client = customClient ?? getRedisClient();
  }

  public getKey(fingerprint: string): string {
    return `dedup:${fingerprint}`;
  }

  public async getEntry(fingerprint: string): Promise<DedupEntry | null> {
    const key = this.getKey(fingerprint);
    const data = await this.client.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      severity: (data['severity'] as DedupEntry['severity']) || 'unknown',
      count: parseInt(data['count'] || '1', 10),
      firstSeenAt: data['firstSeenAt'] || new Date().toISOString(),
      lastSeenAt: data['lastSeenAt'] || new Date().toISOString(),
      normalizedAlert: data['normalizedAlert'] || '{}',
    };
  }

  public async createEntry(alert: Alert, ttlSeconds: number): Promise<DedupEntry> {
    const key = this.getKey(alert.fingerprint);
    const now = new Date().toISOString();
    const entry: DedupEntry = {
      severity: alert.severity_score || 'unknown',
      count: 1,
      firstSeenAt: now,
      lastSeenAt: now,
      normalizedAlert: JSON.stringify(alert),
    };

    const multi = this.client.multi();
    multi.hset(key, {
      severity: entry.severity,
      count: '1',
      firstSeenAt: entry.firstSeenAt,
      lastSeenAt: entry.lastSeenAt,
      normalizedAlert: entry.normalizedAlert,
    });
    multi.expire(key, ttlSeconds);
    await multi.exec();

    return entry;
  }

  public async incrementEntry(
    fingerprint: string,
    alert: Alert,
    ttlSeconds: number
  ): Promise<{ count: number; firstSeenAt: string; lastSeenAt: string }> {
    const key = this.getKey(fingerprint);
    const now = new Date().toISOString();

    const multi = this.client.multi();
    multi.hincrby(key, 'count', 1);
    multi.hset(key, {
      lastSeenAt: now,
      severity: alert.severity_score || 'unknown',
      normalizedAlert: JSON.stringify(alert),
    });
    multi.expire(key, ttlSeconds);

    const results = await multi.exec();
    const newCount = (results?.[0]?.[1] as number) ?? 2;

    const existingFirstSeen = await this.client.hget(key, 'firstSeenAt');

    return {
      count: newCount,
      firstSeenAt: existingFirstSeen || now,
      lastSeenAt: now,
    };
  }

  public async deleteEntry(fingerprint: string): Promise<void> {
    const key = this.getKey(fingerprint);
    await this.client.del(key);
  }
}
