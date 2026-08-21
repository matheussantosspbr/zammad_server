import { ListMyTicketsController } from "../../presentation/controllers/list-my-tickets-controller.js"
import { PrismaTicketRepository } from "../repositories/prisma-ticket-repository.js"
import { ListMyTicketsUseCase } from "../use-cases/list-my-tickets.js"

export function makeListMyTicketsController(): ListMyTicketsController {
	const ticketRepository = new PrismaTicketRepository()
	const listMyTicketsUseCase = new ListMyTicketsUseCase(ticketRepository)
	return new ListMyTicketsController(listMyTicketsUseCase)
}
