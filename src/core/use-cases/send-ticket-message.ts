import type { TicketMessageDTO } from "./list-ticket-messages.js"

export interface SendTicketMessageAttachment {
	filename: string
	mimeType: string
	buffer: Buffer
}

export interface ISendTicketMessageUseCase {
	execute(
		userId: string,
		ticketId: number,
		body: string,
		attachments: SendTicketMessageAttachment[],
	): Promise<TicketMessageDTO[] | null>
}
