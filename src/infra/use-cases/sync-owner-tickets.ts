import type { TicketStatus } from "@prisma/client"
import { env } from "#env"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type { ISyncOwnerTicketsUseCase } from "../../core/use-cases/sync-owner-tickets.js"
import Zammad from "../libs/zammad-client.js"

function toTicketStatus(state: string): TicketStatus {
	return state.replace(/ /g, "_") as TicketStatus
}

export class SyncOwnerTicketsUseCase implements ISyncOwnerTicketsUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(userId: string, zammadOwnerId: number): Promise<void> {
		const tickets = await new Zammad(env.ZAMMAD_TOKEN).searchTicketsByOwner(zammadOwnerId)

		for (const ticket of tickets) {
			await this.ticketRepository.upsertByTicketId({
				ticketId: ticket.id,
				ticketNumber: ticket.number,
				title: ticket.title,
				ticketStatus: toTicketStatus(ticket.state),
				ticketJson: ticket,
				userId,
			})
		}
	}
}
