import type { TicketMessageDTO } from "./list-ticket-messages.js"

export class MessageNotFoundError extends Error {
	constructor() {
		super("Mensagem não encontrada")
	}
}

export class MessageNotDeletableError extends Error {
	constructor() {
		super("Só é possível apagar suas próprias mensagens internas")
	}
}

export class DeleteWindowExpiredError extends Error {
	constructor() {
		super("Prazo de 5 minutos para apagar essa mensagem já passou")
	}
}

export interface IDeleteTicketMessageUseCase {
	execute(userId: string, ticketId: number, messageId: string): Promise<TicketMessageDTO[] | null>
}
