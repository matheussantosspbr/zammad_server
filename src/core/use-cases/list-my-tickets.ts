import type { FrontendTicketStatus } from "../entities/ticket-status.js"

export interface MyTicket {
	id: string
	subject: string
	status: FrontendTicketStatus
	createdAt: string
	updatedAt: string
}

export interface IListMyTicketsUseCase {
	execute(userId: string): Promise<MyTicket[]>
}
