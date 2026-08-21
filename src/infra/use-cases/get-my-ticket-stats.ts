import { toFrontendTicketStatus } from "../../core/entities/ticket-status.js"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type {
	IGetMyTicketStatsUseCase,
	MyTicketStats,
} from "../../core/use-cases/get-my-ticket-stats.js"

export class GetMyTicketStatsUseCase implements IGetMyTicketStatsUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(userId: string): Promise<MyTicketStats> {
		const tickets = await this.ticketRepository.findByUserId(userId)

		const stats: MyTicketStats = { total: tickets.length, open: 0, pending: 0, closed: 0 }

		for (const ticket of tickets) {
			const status = toFrontendTicketStatus(ticket.ticketStatus)
			if (status === "OPEN") stats.open += 1
			else if (status === "PENDING") stats.pending += 1
			else stats.closed += 1
		}

		return stats
	}
}
