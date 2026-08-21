import { PrismaTicketRepository } from "../repositories/prisma-ticket-repository.js"
import { CloseStaleTicketUseCase } from "../use-cases/close-stale-ticket.js"

export function makeCloseStaleTicketUseCase(): CloseStaleTicketUseCase {
	const ticketRepository = new PrismaTicketRepository()
	return new CloseStaleTicketUseCase(ticketRepository)
}
