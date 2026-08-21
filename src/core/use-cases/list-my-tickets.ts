import type { FrontendTicketStatus } from "../entities/ticket-status.js"

export interface MyTicket {
	id: string
	ticketNumber: string
	subject: string
	status: FrontendTicketStatus
	firstMessagePreview: string | null
	createdAt: string
	updatedAt: string
}

export interface IListMyTicketsUseCase {
	execute(userId: string): Promise<MyTicket[]>
}
