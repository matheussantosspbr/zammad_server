import { toFrontendTicketStatus } from "../../core/entities/ticket-status.js"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type { IListMyTicketsUseCase, MyTicket } from "../../core/use-cases/list-my-tickets.js"

export class ListMyTicketsUseCase implements IListMyTicketsUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(userId: string): Promise<MyTicket[]> {
		const tickets = await this.ticketRepository.findByUserId(userId)

		return tickets.map((ticket) => {
			const raw = ticket.ticketJson as { created_at?: string; updated_at?: string }

			return {
				id: String(ticket.ticketId),
				subject: ticket.title,
				status: toFrontendTicketStatus(ticket.ticketStatus),
				createdAt: raw.created_at ?? ticket.updatedAt.toISOString(),
				updatedAt: raw.updated_at ?? ticket.updatedAt.toISOString(),
			}
		})
	}
}
