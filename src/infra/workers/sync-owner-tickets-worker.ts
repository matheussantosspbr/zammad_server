import { Worker } from "bullmq"
import { makeSyncOwnerTicketsUseCase } from "../factories/make-sync-owner-tickets-use-case.js"
import { redisConnection } from "../libs/redis.js"
import {
	SYNC_OWNER_TICKETS_QUEUE,
	type SyncOwnerTicketsJobData,
} from "../queues/sync-owner-tickets-queue.js"

export const syncOwnerTicketsWorker = new Worker<SyncOwnerTicketsJobData>(
	SYNC_OWNER_TICKETS_QUEUE,
	async (job) => {
		await makeSyncOwnerTicketsUseCase().execute(job.data.userId, job.data.zammadOwnerId)
	},
	{ connection: redisConnection },
)

syncOwnerTicketsWorker.on("completed", (job) => {
	console.log(`✅ Tickets sincronizados para o usuário ${job.data.userId}`)
})

syncOwnerTicketsWorker.on("failed", (job, error) => {
	console.error(`❌ Falha ao sincronizar tickets do usuário ${job?.data.userId}:`, error)
})
