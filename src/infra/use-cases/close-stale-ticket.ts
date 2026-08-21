import { env } from "#env"
import { toPrismaTicketStatus } from "../../core/entities/ticket-status.js"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import { mapArticlesToMessages } from "../libs/ticket-message-mapper.js"
import Zammad from "../libs/zammad-client.js"
import type { AutoCloseTicketJobData } from "../queues/auto-close-ticket-queue.js"

export class CloseStaleTicketUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(data: AutoCloseTicketJobData): Promise<void> {
		const zammad = new Zammad(env.ZAMMAD_TOKEN)
		await zammad.updateTicketStatus(data.ticketId, "closed")

		const [ticket, articles] = await Promise.all([
			zammad.getTicket(data.ticketId),
			zammad.getTicketArticles(data.ticketId),
		])
		const messages = mapArticlesToMessages(articles, ticket.id)

		await this.ticketRepository.upsertByTicketId({
			ticketId: ticket.id,
			ticketNumber: ticket.number,
			title: ticket.title,
			ticketStatus: toPrismaTicketStatus(ticket.state),
			ticketJson: { ...ticket, messages },
			userId: data.userId,
		})
	}
}
