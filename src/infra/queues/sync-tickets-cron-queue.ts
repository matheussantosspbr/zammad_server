import { Queue } from "bullmq"
import { redisConnection } from "../libs/redis.js"

export const SYNC_TICKETS_CRON_QUEUE = "sync-tickets-cron"
export const SYNC_TICKETS_CRON_INTERVAL_MS = 30 * 60 * 1000

export const syncTicketsCronQueue = new Queue(SYNC_TICKETS_CRON_QUEUE, {
	connection: redisConnection,
})
