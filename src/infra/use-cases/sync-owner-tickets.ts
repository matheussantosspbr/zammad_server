import { env } from "#env"
import { toPrismaTicketStatus } from "../../core/entities/ticket-status.js"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type { ISyncOwnerTicketsUseCase } from "../../core/use-cases/sync-owner-tickets.js"
import { mapArticlesToMessages } from "../libs/ticket-message-mapper.js"
import Zammad from "../libs/zammad-client.js"

export class SyncOwnerTicketsUseCase implements ISyncOwnerTicketsUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(userId: string, zammadOwnerId: number): Promise<void> {
		const zammad = new Zammad(env.ZAMMAD_TOKEN)
		const tickets = await zammad.searchTicketsByOwner(zammadOwnerId)

		for (const ticket of tickets) {
			const articles = await zammad.getTicketArticles(ticket.id)
			const messages = mapArticlesToMessages(articles, ticket.id)

			await this.ticketRepository.upsertByTicketId({
				ticketId: ticket.id,
				ticketNumber: ticket.number,
				title: ticket.title,
				ticketStatus: toPrismaTicketStatus(ticket.state),
				ticketJson: { ...ticket, messages },
				userId,
			})
		}
	}
}
