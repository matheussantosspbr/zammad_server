import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type {
	IListTicketMessagesUseCase,
	TicketMessageDTO,
} from "../../core/use-cases/list-ticket-messages.js"

interface StoredTicketJson {
	messages?: TicketMessageDTO[]
}

export class ListTicketMessagesUseCase implements IListTicketMessagesUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(userId: string, ticketId: number): Promise<TicketMessageDTO[] | null> {
		const ticket = await this.ticketRepository.findByTicketId(ticketId)

		if (!ticket || ticket.userId !== userId) {
			return null
		}

		const ticketJson = ticket.ticketJson as StoredTicketJson
		return ticketJson.messages ?? []
	}
}
