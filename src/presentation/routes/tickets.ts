import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import { env } from "#env"
import { makeDeleteTicketMessageController } from "../../infra/factories/make-delete-ticket-message-controller.js"
import { makeGetMyTicketStatsController } from "../../infra/factories/make-get-my-ticket-stats-controller.js"
import { makeListMyTicketsController } from "../../infra/factories/make-list-my-tickets-controller.js"
import { makeListTicketMessagesController } from "../../infra/factories/make-list-ticket-messages-controller.js"
import { makeSendTicketMessageController } from "../../infra/factories/make-send-ticket-message-controller.js"
import Zammad from "../../infra/libs/zammad-client.js"
import { PrismaTicketRepository } from "../../infra/repositories/prisma-ticket-repository.js"
import { adaptMultipartRoute, adaptRoute } from "../adapters/fastify-route-adapter.js"
import { requireAuth } from "../middlewares/require-auth.js"

export default async function ticketsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.get("/tickets", { preHandler: requireAuth }, adaptRoute(makeListMyTicketsController()))

	app.get(
		"/tickets/stats",
		{ preHandler: requireAuth },
		adaptRoute(makeGetMyTicketStatsController()),
	)

	app.get(
		"/tickets/:ticketId/messages",
		{ preHandler: requireAuth },
		adaptRoute(makeListTicketMessagesController()),
	)

	app.post(
		"/tickets/:ticketId/messages",
		{ preHandler: requireAuth },
		adaptMultipartRoute(makeSendTicketMessageController()),
	)

	app.delete(
		"/tickets/:ticketId/messages/:messageId",
		{ preHandler: requireAuth },
		adaptRoute(makeDeleteTicketMessageController()),
	)

	app.get<{ Params: { ticketId: string; articleId: string; attachmentId: string } }>(
		"/tickets/:ticketId/articles/:articleId/attachments/:attachmentId",
		{ preHandler: requireAuth },
		async (request, reply) => {
			const ticketId = Number(request.params.ticketId)
			const articleId = Number(request.params.articleId)
			const attachmentId = Number(request.params.attachmentId)

			const ticketRepository = new PrismaTicketRepository()
			const ticket = await ticketRepository.findByTicketId(ticketId)

			if (!ticket || ticket.userId !== request.userId) {
				return reply.status(404).send({ error: "Anexo não encontrado" })
			}

			const file = await new Zammad(env.ZAMMAD_TOKEN).getAttachment(
				ticketId,
				articleId,
				attachmentId,
			)

			reply.header("Content-Type", file.contentType)
			reply.header("Cache-Control", "private, max-age=3600")
			return reply.send(file.buffer)
		},
	)
}
