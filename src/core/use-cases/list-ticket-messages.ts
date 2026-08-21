export interface TicketMessageAttachment {
	id: string
	filename: string
	contentType: string
	url: string
}

export interface TicketMessageDTO {
	id: string
	author: "user" | "agent"
	authorName: string
	content: string
	contentType: string
	internal: boolean
	createdAt: string
	attachments: TicketMessageAttachment[]
}

export interface IListTicketMessagesUseCase {
	execute(userId: string, ticketId: number): Promise<TicketMessageDTO[] | null>
}
