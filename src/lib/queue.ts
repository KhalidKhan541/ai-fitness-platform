import Redis from "ioredis";

let queueConnection: Redis | null = null;

function getQueueConnection(): Redis {
  if (!queueConnection) {
    queueConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true,
    });
  }
  return queueConnection;
}

export interface JobData {
  [key: string]: unknown;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: "fixed" | "exponential";
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface Job<T = JobData> {
  id: string;
  name: string;
  data: T;
  status: "waiting" | "active" | "completed" | "failed" | "delayed";
  progress: number;
  result?: unknown;
  error?: string;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
}

type QueueEventHandler = (...args: unknown[]) => void;

class Queue<T extends JobData = JobData> {
  private name: string;
  private connection: Redis;
  private listeners: Map<string, Set<QueueEventHandler>> = new Map();

  constructor(name: string) {
    this.name = name;
    this.connection = getQueueConnection();
  }

  private getPrefix(): string {
    return `queue:${this.name}`;
  }

  private getJobKey(jobId: string): string {
    return `${this.getPrefix()}:job:${jobId}`;
  }

  async add(
    name: string,
    data: T,
    options: JobOptions = {}
  ): Promise<Job<T>> {
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();

    const job: Job<T> = {
      id: jobId,
      name,
      data,
      status: options.delay ? "delayed" : "waiting",
      progress: 0,
      createdAt: now,
    };

    const pipeline = this.connection.pipeline();
    pipeline.hset(this.getJobKey(jobId), this.serializeJob(job));
    pipeline.zadd(`${this.getPrefix()}:waiting`, now, jobId);

    if (options.priority) {
      pipeline.hset(this.getJobKey(jobId), "priority", options.priority);
    }

    await pipeline.exec();
    this.emit("job:added", job);
    return job;
  }

  async getNextJob(): Promise<Job<T> | null> {
    const result = await this.connection.zpopmin(`${this.getPrefix()}:waiting`);
    if (!result || result.length === 0) return null;

    const [jobId] = result;
    const jobData = await this.connection.hgetall(this.getJobKey(jobId));
    if (!jobData || Object.keys(jobData).length === 0) return null;

    const job = this.deserializeJob(jobData) as Job<T>;
    job.status = "active";
    job.processedAt = Date.now();

    await this.connection.hset(this.getJobKey(jobId), {
      status: "active",
      processedAt: job.processedAt,
    });

    return job;
  }

  async complete(jobId: string, result?: unknown): Promise<void> {
    const jobData = await this.connection.hgetall(this.getJobKey(jobId));
    if (!jobData || Object.keys(jobData).length === 0) return;

    const job = this.deserializeJob(jobData);
    job.status = "completed";
    job.result = result;
    job.completedAt = Date.now();

    await this.connection.hset(this.getJobKey(jobId), {
      status: "completed",
      result: JSON.stringify(result),
      completedAt: job.completedAt,
    });

    this.emit("job:completed", job);
  }

  async fail(jobId: string, error: string): Promise<void> {
    const jobData = await this.connection.hgetall(this.getJobKey(jobId));
    if (!jobData || Object.keys(jobData).length === 0) return;

    const job = this.deserializeJob(jobData);
    job.status = "failed";
    job.error = error;

    await this.connection.hset(this.getJobKey(jobId), {
      status: "failed",
      error,
    });

    this.emit("job:failed", job);
  }

  async updateProgress(jobId: string, progress: number): Promise<void> {
    await this.connection.hset(this.getJobKey(jobId), {
      progress: Math.min(100, Math.max(0, progress)),
    });
  }

  async getJob(jobId: string): Promise<Job<T> | null> {
    const jobData = await this.connection.hgetall(this.getJobKey(jobId));
    if (!jobData || Object.keys(jobData).length === 0) return null;
    return this.deserializeJob(jobData) as Job<T>;
  }

  async getJobs(
    status: Job["status"],
    start: number = 0,
    end: number = 50
  ): Promise<Job<T>[]> {
    const key = `${this.getPrefix()}:${status}`;
    const jobIds = await this.connection.zrange(key, start, end);
    const jobs: Job<T>[] = [];

    for (const jobId of jobIds) {
      const job = await this.getJob(jobId);
      if (job) jobs.push(job);
    }

    return jobs;
  }

  async getJobCount(): Promise<Record<Job["status"], number>> {
    const pipeline = this.connection.pipeline();
    pipeline.zcard(`${this.getPrefix()}:waiting`);
    pipeline.zcard(`${this.getPrefix()}:active`);
    pipeline.zcard(`${this.getPrefix()}:completed`);
    pipeline.zcard(`${this.getPrefix()}:failed`);
    pipeline.zcard(`${this.getPrefix()}:delayed`);

    const results = await pipeline.exec();
    const counts = results?.map((r) => (r[1] as number) || 0) || [];

    return {
      waiting: counts[0] || 0,
      active: counts[1] || 0,
      completed: counts[2] || 0,
      failed: counts[3] || 0,
      delayed: counts[4] || 0,
    };
  }

  async clean(
    status: Job["status"],
    maxAge?: number,
    count?: number
  ): Promise<number> {
    const key = `${this.getPrefix()}:${status}`;
    let jobIds: string[];

    if (maxAge) {
      const minScore = Date.now() - maxAge;
      jobIds = await this.connection.zrangebyscore(key, "-inf", minScore);
    } else {
      jobIds = await this.connection.zrange(key, 0, count ?? -1);
    }

    const pipeline = this.connection.pipeline();
    for (const jobId of jobIds.slice(0, count ?? Infinity)) {
      pipeline.del(this.getJobKey(jobId));
      pipeline.zrem(key, jobId);
    }

    await pipeline.exec();
    return jobIds.length;
  }

  async removeJob(jobId: string): Promise<void> {
    const jobData = await this.connection.hgetall(this.getJobKey(jobId));
    if (!jobData || Object.keys(jobData).length === 0) return;

    const pipeline = this.connection.pipeline();
    pipeline.del(this.getJobKey(jobId));
    pipeline.zrem(`${this.getPrefix()}:waiting`, jobId);
    pipeline.zrem(`${this.getPrefix()}:active`, jobId);
    pipeline.zrem(`${this.getPrefix()}:completed`, jobId);
    pipeline.zrem(`${this.getPrefix()}:failed`, jobId);
    pipeline.zrem(`${this.getPrefix()}:delayed`, jobId);

    await pipeline.exec();
  }

  on(event: string, handler: QueueEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: QueueEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch {
        // silent fail
      }
    });
  }

  private serializeJob(job: Job<T>): Record<string, string> {
    return {
      id: job.id,
      name: job.name,
      data: JSON.stringify(job.data),
      status: job.status,
      progress: String(job.progress),
      result: job.result ? JSON.stringify(job.result) : "",
      error: job.error || "",
      createdAt: String(job.createdAt),
      processedAt: job.processedAt ? String(job.processedAt) : "",
      completedAt: job.completedAt ? String(job.completedAt) : "",
    };
  }

  private deserializeJob(data: Record<string, string>): Job<T> {
    return {
      id: data.id,
      name: data.name,
      data: JSON.parse(data.data) as T,
      status: data.status as Job["status"],
      progress: Number(data.progress) || 0,
      result: data.result ? JSON.parse(data.result) : undefined,
      error: data.error || undefined,
      createdAt: Number(data.createdAt),
      processedAt: data.processedAt ? Number(data.processedAt) : undefined,
      completedAt: data.completedAt ? Number(data.completedAt) : undefined,
    };
  }
}

const queues = new Map<string, Queue>();

export function getQueue<T extends JobData = JobData>(name: string): Queue<T> {
  if (!queues.has(name)) {
    queues.set(name, new Queue<T>(name));
  }
  return queues.get(name) as Queue<T>;
}

export async function processQueue<T extends JobData>(
  name: string,
  handler: (job: Job<T>) => Promise<unknown>,
  concurrency: number = 1
): Promise<void> {
  const queue = getQueue<T>(name);
  let processing = 0;

  const processNext = async () => {
    if (processing >= concurrency) return;

    const job = await queue.getNextJob();
    if (!job) {
      setTimeout(processNext, 1000);
      return;
    }

    processing++;
    try {
      const result = await handler(job);
      await queue.complete(job.id, result);
    } catch (error) {
      await queue.fail(job.id, String(error));
    } finally {
      processing--;
      processNext();
    }
  };

  await processNext();
}

export async function disconnectQueue(): Promise<void> {
  if (queueConnection) {
    await queueConnection.quit();
    queueConnection = null;
  }
}
