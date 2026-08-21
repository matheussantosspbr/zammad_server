import type { ISendTicketMessageUseCase } from "../../core/use-cases/send-ticket-message.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"
import { sendTicketMessageBodySchema } from "../schemas/ticket-message-schema.js"

export class SendTicketMessageController implements Controller {
	constructor(private readonly sendTicketMessageUseCase: ISendTicketMessageUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		if (!request.userId) {
			return { statusCode: 401, body: { error: "Unauthorized" } }
		}

		const ticketId = Number(request.params?.ticketId)

		if (!Number.isInteger(ticketId)) {
			return { statusCode: 400, body: { error: "ticketId inválido" } }
		}

		const parsed = sendTicketMessageBodySchema.safeParse(request.body)

		if (!parsed.success) {
			return { statusCode: 400, body: { error: parsed.error.message } }
		}

		const attachments = request.files ?? []

		if (!parsed.data.body.trim() && attachments.length === 0) {
			return {
				statusCode: 400,
				body: { error: "Escreva uma mensagem ou anexe um arquivo" },
			}
		}

		const messages = await this.sendTicketMessageUseCase.execute(
			request.userId,
			ticketId,
			parsed.data.body,
			attachments,
		)

		if (!messages) {
			return { statusCode: 404, body: { error: "Ticket não encontrado" } }
		}

		return { statusCode: 200, body: messages }
	}
}
