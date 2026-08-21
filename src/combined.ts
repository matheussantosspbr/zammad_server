import { env } from "#env"
import { buildApp } from "./app.js"
import { registerSyncTicketsCron } from "./infra/crons/register-sync-tickets-cron.js"
import "./infra/workers/sync-owner-tickets-worker.js"
import "./infra/workers/auto-close-ticket-worker.js"
import "./infra/workers/sync-tickets-cron-worker.js"

const app = buildApp()

try {
	const address = await app.listen({ port: env.APPLICATION_PORT, host: "0.0.0.0" })
	console.log(`🚀 The server is running on ${address}`)

	await registerSyncTicketsCron()
	console.log("🔧 Worker de sincronização de tickets rodando junto com o servidor")
} catch (err) {
	app.log.error(err)
	process.exit(1)
}
