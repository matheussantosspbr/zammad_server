import {
	DeleteWindowExpiredError,
	type IDeleteTicketMessageUseCase,
	MessageNotDeletableError,
	MessageNotFoundError,
} from "../../core/use-cases/delete-ticket-message.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"

export class DeleteTicketMessageController implements Controller {
	constructor(private readonly deleteTicketMessageUseCase: IDeleteTicketMessageUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		if (!request.userId) {
			return { statusCode: 401, body: { error: "Unauthorized" } }
		}

		const ticketId = Number(request.params?.ticketId)
		const messageId = request.params?.messageId

		if (!Number.isInteger(ticketId) || !messageId) {
			return { statusCode: 400, body: { error: "Parâmetros inválidos" } }
		}

		try {
			const messages = await this.deleteTicketMessageUseCase.execute(
				request.userId,
				ticketId,
				messageId,
			)

			if (!messages) {
				return { statusCode: 404, body: { error: "Ticket não encontrado" } }
			}

			return { statusCode: 200, body: messages }
		} catch (error) {
			if (error instanceof MessageNotFoundError) {
				return { statusCode: 404, body: { error: error.message } }
			}

			if (
				error instanceof MessageNotDeletableError ||
				error instanceof DeleteWindowExpiredError
			) {
				return { statusCode: 403, body: { error: error.message } }
			}

			throw error
		}
	}
}
