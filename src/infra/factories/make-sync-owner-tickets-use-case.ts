import { PrismaTicketRepository } from "../repositories/prisma-ticket-repository.js"
import { SyncOwnerTicketsUseCase } from "../use-cases/sync-owner-tickets.js"

export function makeSyncOwnerTicketsUseCase(): SyncOwnerTicketsUseCase {
	const ticketRepository = new PrismaTicketRepository()
	return new SyncOwnerTicketsUseCase(ticketRepository)
}
