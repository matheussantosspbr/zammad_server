import type { IListTicketMessagesUseCase } from "../../core/use-cases/list-ticket-messages.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"

export class ListTicketMessagesController implements Controller {
	constructor(private readonly listTicketMessagesUseCase: IListTicketMessagesUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		if (!request.userId) {
			return { statusCode: 401, body: { error: "Unauthorized" } }
		}

		const ticketId = Number(request.params?.ticketId)

		if (!Number.isInteger(ticketId)) {
			return { statusCode: 400, body: { error: "ticketId inválido" } }
		}

		const messages = await this.listTicketMessagesUseCase.execute(request.userId, ticketId)

		if (!messages) {
			return { statusCode: 404, body: { error: "Ticket não encontrado" } }
		}

		return { statusCode: 200, body: messages }
	}
}
