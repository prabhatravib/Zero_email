import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queue definitions
export const threadQueue = new Queue('thread-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const subscribeQueue = new Queue('subscribe-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job types
export interface IThreadBatch {
  providerId: string;
  historyId: string;
  subscriptionName: string;
}

export interface ISubscribeBatch {
  connectionId: string;
  providerId: string;
}

// Queue helper functions (replaces Cloudflare Queue API)
export const queueService = {
  // Send to thread queue
  async sendToThreadQueue(data: IThreadBatch) {
    await threadQueue.add('process-thread', data, {
      priority: 1,
    });
  },

  // Send to subscribe queue
  async sendToSubscribeQueue(data: ISubscribeBatch) {
    await subscribeQueue.add('enable-brain', data, {
      priority: 2,
    });
  },

  // Process thread jobs
  async processThreadJob(job: Job<IThreadBatch>) {
    const { providerId, historyId, subscriptionName } = job.data;
    
    try {
      // Your existing thread processing logic here
      console.log('[THREAD_QUEUE] Processing:', { providerId, historyId, subscriptionName });
      
      // TODO: Add your workflow runner logic here
      // const workflowRunner = env.WORKFLOW_RUNNER.get(env.WORKFLOW_RUNNER.newUniqueId());
      // const result = await workflowRunner.runMainWorkflow({
      //   providerId,
      //   historyId,
      //   subscriptionName,
      // });
      
      console.log('[THREAD_QUEUE] Processed successfully');
    } catch (error) {
      console.error('[THREAD_QUEUE] Error processing job:', error);
      throw error; // This will trigger retry
    }
  },

  // Process subscribe jobs
  async processSubscribeJob(job: Job<ISubscribeBatch>) {
    const { connectionId, providerId } = job.data;
    
    try {
      // Your existing subscribe processing logic here
      console.log('[SUBSCRIBE_QUEUE] Processing:', { connectionId, providerId });
      
      // TODO: Add your enableBrainFunction logic here
      // await enableBrainFunction({ id: connectionId, providerId });
      
      console.log('[SUBSCRIBE_QUEUE] Processed successfully');
    } catch (error) {
      console.error('[SUBSCRIBE_QUEUE] Error processing job:', error);
      throw error; // This will trigger retry
    }
  },
};

// Initialize workers
export const initializeWorkers = () => {
  // Thread queue worker
  const threadWorker = new Worker('thread-queue', async (job) => {
    await queueService.processThreadJob(job);
  }, {
    connection: redis,
    concurrency: 5, // Process 5 jobs concurrently
  });

  // Subscribe queue worker
  const subscribeWorker = new Worker('subscribe-queue', async (job) => {
    await queueService.processSubscribeJob(job);
  }, {
    connection: redis,
    concurrency: 3, // Process 3 jobs concurrently
  });

  // Error handling
  threadWorker.on('error', (error) => {
    console.error('[THREAD_WORKER] Error:', error);
  });

  subscribeWorker.on('error', (error) => {
    console.error('[SUBSCRIBE_WORKER] Error:', error);
  });

  return { threadWorker, subscribeWorker };
}; 