import { PrismaTicketRepository } from "../repositories/prisma-ticket-repository.js"
import { RunTicketsSyncCronUseCase } from "../use-cases/run-tickets-sync-cron.js"

export function makeRunTicketsSyncCronUseCase(): RunTicketsSyncCronUseCase {
	const ticketRepository = new PrismaTicketRepository()
	return new RunTicketsSyncCronUseCase(ticketRepository)
}
