import { env } from "#env"
import { toPrismaTicketStatus } from "../../core/entities/ticket-status.js"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import {
	DeleteWindowExpiredError,
	type IDeleteTicketMessageUseCase,
	MessageNotDeletableError,
	MessageNotFoundError,
} from "../../core/use-cases/delete-ticket-message.js"
import type { TicketMessageDTO } from "../../core/use-cases/list-ticket-messages.js"
import { mapArticlesToMessages } from "../libs/ticket-message-mapper.js"
import Zammad from "../libs/zammad-client.js"

const DELETE_WINDOW_MS = 5 * 60 * 1000

interface StoredTicketJson {
	messages?: TicketMessageDTO[]
}

export class DeleteTicketMessageUseCase implements IDeleteTicketMessageUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(
		userId: string,
		ticketId: number,
		messageId: string,
	): Promise<TicketMessageDTO[] | null> {
		const ticket = await this.ticketRepository.findByTicketId(ticketId)

		if (!ticket || ticket.userId !== userId) {
			return null
		}

		const storedMessages = (ticket.ticketJson as StoredTicketJson).messages ?? []
		const message = storedMessages.find((item) => item.id === messageId)

		if (!message) {
			throw new MessageNotFoundError()
		}

		if (message.author !== "user" || !message.internal) {
			throw new MessageNotDeletableError()
		}

		if (Date.now() - new Date(message.createdAt).getTime() > DELETE_WINDOW_MS) {
			throw new DeleteWindowExpiredError()
		}

		const zammad = new Zammad(env.ZAMMAD_TOKEN)
		await zammad.deleteTicketArticle(Number(messageId))

		const [freshTicket, articles] = await Promise.all([
			zammad.getTicket(ticketId),
			zammad.getTicketArticles(ticketId),
		])
		const messages = mapArticlesToMessages(articles, ticketId)

		await this.ticketRepository.upsertByTicketId({
			ticketId: freshTicket.id,
			ticketNumber: freshTicket.number,
			title: freshTicket.title,
			ticketStatus: toPrismaTicketStatus(freshTicket.state),
			ticketJson: { ...freshTicket, messages },
			userId,
		})

		return messages
	}
}
