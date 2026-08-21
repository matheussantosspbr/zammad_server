import { toFrontendTicketStatus } from "../../core/entities/ticket-status.js"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type { IListMyTicketsUseCase, MyTicket } from "../../core/use-cases/list-my-tickets.js"
import type { TicketMessageDTO } from "../../core/use-cases/list-ticket-messages.js"
import { toPlainTextPreview } from "../libs/ticket-message-mapper.js"

export class ListMyTicketsUseCase implements IListMyTicketsUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(userId: string): Promise<MyTicket[]> {
		const tickets = await this.ticketRepository.findByUserId(userId)

		return tickets.map((ticket) => {
			const raw = ticket.ticketJson as {
				created_at?: string
				updated_at?: string
				messages?: TicketMessageDTO[]
			}
			const firstMessage = raw.messages?.[0]

			return {
				id: String(ticket.ticketId),
				ticketNumber: ticket.ticketNumber,
				subject: ticket.title,
				status: toFrontendTicketStatus(ticket.ticketStatus),
				firstMessagePreview: firstMessage ? toPlainTextPreview(firstMessage) : null,
				createdAt: raw.created_at ?? ticket.updatedAt.toISOString(),
				updatedAt: raw.updated_at ?? ticket.updatedAt.toISOString(),
			}
		})
	}
}
