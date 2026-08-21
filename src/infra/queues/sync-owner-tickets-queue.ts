import { Queue } from "bullmq"
import { redisConnection } from "../libs/redis.js"

export interface SyncOwnerTicketsJobData {
	userId: string
	zammadOwnerId: number
}

export const SYNC_OWNER_TICKETS_QUEUE = "sync-owner-tickets"

export const syncOwnerTicketsQueue = new Queue<SyncOwnerTicketsJobData>(SYNC_OWNER_TICKETS_QUEUE, {
	connection: redisConnection,
})
