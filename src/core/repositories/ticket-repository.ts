import type { TicketStatus, Tickets } from "@prisma/client"

export interface UpsertTicketInput {
	ticketId: number
	ticketNumber: string
	title: string
	ticketStatus: TicketStatus
	ticketJson: unknown
	userId: string
}

export interface ITicketRepository {
	upsertByTicketId(input: UpsertTicketInput): Promise<void>
	findByUserId(userId: string): Promise<Tickets[]>
}
