import { ListTicketMessagesController } from "../../presentation/controllers/list-ticket-messages-controller.js"
import { PrismaTicketRepository } from "../repositories/prisma-ticket-repository.js"
import { ListTicketMessagesUseCase } from "../use-cases/list-ticket-messages.js"

export function makeListTicketMessagesController(): ListTicketMessagesController {
	const ticketRepository = new PrismaTicketRepository()
	const listTicketMessagesUseCase = new ListTicketMessagesUseCase(ticketRepository)
	return new ListTicketMessagesController(listTicketMessagesUseCase)
}
