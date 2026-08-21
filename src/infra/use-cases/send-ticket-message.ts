import { env } from "#env"
import { toPrismaTicketStatus } from "../../core/entities/ticket-status.js"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type { TicketMessageDTO } from "../../core/use-cases/list-ticket-messages.js"
import type {
	ISendTicketMessageUseCase,
	SendTicketMessageAttachment,
} from "../../core/use-cases/send-ticket-message.js"
import { mapArticlesToMessages } from "../libs/ticket-message-mapper.js"
import Zammad from "../libs/zammad-client.js"

export class SendTicketMessageUseCase implements ISendTicketMessageUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(
		userId: string,
		ticketId: number,
		body: string,
		attachments: SendTicketMessageAttachment[],
	): Promise<TicketMessageDTO[] | null> {
		const ticket = await this.ticketRepository.findByTicketId(ticketId)

		if (!ticket || ticket.userId !== userId) {
			return null
		}

		const zammad = new Zammad(env.ZAMMAD_TOKEN)

		await zammad.createTicketArticle({
			ticketId,
			body,
			attachments: attachments.map((attachment) => ({
				filename: attachment.filename,
				data: attachment.buffer.toString("base64"),
				"mime-type": attachment.mimeType,
			})),
		})

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
