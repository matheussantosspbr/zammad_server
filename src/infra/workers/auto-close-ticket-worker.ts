import { Worker } from "bullmq"
import { makeCloseStaleTicketUseCase } from "../factories/make-close-stale-ticket-use-case.js"
import { redisConnection } from "../libs/redis.js"
import {
	AUTO_CLOSE_TICKET_QUEUE,
	type AutoCloseTicketJobData,
} from "../queues/auto-close-ticket-queue.js"

export const autoCloseTicketWorker = new Worker<AutoCloseTicketJobData>(
	AUTO_CLOSE_TICKET_QUEUE,
	async (job) => {
		await makeCloseStaleTicketUseCase().execute(job.data)
	},
	{ connection: redisConnection },
)

autoCloseTicketWorker.on("completed", (job) => {
	console.log(`✅ Ticket ${job.data.ticketNumber} fechado automaticamente por inatividade`)
})

autoCloseTicketWorker.on("failed", (job, error) => {
	console.error(`❌ Falha ao fechar automaticamente o ticket ${job?.data.ticketNumber}:`, error)
})
