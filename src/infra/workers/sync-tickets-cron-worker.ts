import { Worker } from "bullmq"
import { makeRunTicketsSyncCronUseCase } from "../factories/make-run-tickets-sync-cron-use-case.js"
import { redisConnection } from "../libs/redis.js"
import { SYNC_TICKETS_CRON_QUEUE } from "../queues/sync-tickets-cron-queue.js"

export const syncTicketsCronWorker = new Worker(
	SYNC_TICKETS_CRON_QUEUE,
	async () => {
		await makeRunTicketsSyncCronUseCase().execute()
	},
	{ connection: redisConnection },
)

syncTicketsCronWorker.on("completed", () => {
	console.log("✅ Sincronização periódica de tickets concluída")
})

syncTicketsCronWorker.on("failed", (_job, error) => {
	console.error("❌ Falha na sincronização periódica de tickets:", error)
})
