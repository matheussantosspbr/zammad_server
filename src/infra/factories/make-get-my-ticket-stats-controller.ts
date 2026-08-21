import { GetMyTicketStatsController } from "../../presentation/controllers/get-my-ticket-stats-controller.js"
import { PrismaTicketRepository } from "../repositories/prisma-ticket-repository.js"
import { GetMyTicketStatsUseCase } from "../use-cases/get-my-ticket-stats.js"

export function makeGetMyTicketStatsController(): GetMyTicketStatsController {
	const ticketRepository = new PrismaTicketRepository()
	const getMyTicketStatsUseCase = new GetMyTicketStatsUseCase(ticketRepository)
	return new GetMyTicketStatsController(getMyTicketStatsUseCase)
}
