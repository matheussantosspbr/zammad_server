import { registerSyncTicketsCron } from "./infra/crons/register-sync-tickets-cron.js"
import "./infra/workers/sync-owner-tickets-worker.js"
import "./infra/workers/auto-close-ticket-worker.js"
import "./infra/workers/sync-tickets-cron-worker.js"

await registerSyncTicketsCron()

console.log("🔧 Worker de sincronização de tickets rodando")
