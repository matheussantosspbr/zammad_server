import { SendTicketMessageController } from "../../presentation/controllers/send-ticket-message-controller.js"
import { PrismaTicketRepository } from "../repositories/prisma-ticket-repository.js"
import { SendTicketMessageUseCase } from "../use-cases/send-ticket-message.js"

export function makeSendTicketMessageController(): SendTicketMessageController {
	const ticketRepository = new PrismaTicketRepository()
	const sendTicketMessageUseCase = new SendTicketMessageUseCase(ticketRepository)
	return new SendTicketMessageController(sendTicketMessageUseCase)
}
