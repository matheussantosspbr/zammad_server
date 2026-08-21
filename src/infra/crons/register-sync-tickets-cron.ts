import {
	SYNC_TICKETS_CRON_INTERVAL_MS,
	syncTicketsCronQueue,
} from "../queues/sync-tickets-cron-queue.js"

/** Registra o job agendado (idempotente — chamar de novo só atualiza o mesmo agendamento). */
export async function registerSyncTicketsCron(): Promise<void> {
	await syncTicketsCronQueue.upsertJobScheduler("sync-tickets-cron-scheduler", {
		every: SYNC_TICKETS_CRON_INTERVAL_MS,
	})
}
