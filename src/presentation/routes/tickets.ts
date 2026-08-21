import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import { makeGetMyTicketStatsController } from "../../infra/factories/make-get-my-ticket-stats-controller.js"
import { makeListMyTicketsController } from "../../infra/factories/make-list-my-tickets-controller.js"
import { adaptRoute } from "../adapters/fastify-route-adapter.js"
import { requireAuth } from "../middlewares/require-auth.js"

export default async function ticketsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.get("/tickets", { preHandler: requireAuth }, adaptRoute(makeListMyTicketsController()))

	app.get(
		"/tickets/stats",
		{ preHandler: requireAuth },
		adaptRoute(makeGetMyTicketStatsController()),
	)
}
