import { DeleteTicketMessageController } from "../../presentation/controllers/delete-ticket-message-controller.js"
import { PrismaTicketRepository } from "../repositories/prisma-ticket-repository.js"
import { DeleteTicketMessageUseCase } from "../use-cases/delete-ticket-message.js"

export function makeDeleteTicketMessageController(): DeleteTicketMessageController {
	const ticketRepository = new PrismaTicketRepository()
	const deleteTicketMessageUseCase = new DeleteTicketMessageUseCase(ticketRepository)
	return new DeleteTicketMessageController(deleteTicketMessageUseCase)
}
