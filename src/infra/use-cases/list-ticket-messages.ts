import { env } from "#env"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type {
	IListTicketMessagesUseCase,
	TicketMessageDTO,
} from "../../core/use-cases/list-ticket-messages.js"
import Zammad, { type ZammadArticle } from "../libs/zammad-client.js"

function extractAuthorName(from: string): string {
	return from.replace(/\s*<[^>]+>\s*$/, "").trim()
}

function toTicketMessage(article: ZammadArticle, ticketId: number): TicketMessageDTO {
	return {
		id: String(article.id),
		author: article.sender === "Agent" ? "user" : "agent",
		authorName: extractAuthorName(article.from),
		content: article.body,
		contentType: article.content_type,
		internal: article.internal,
		createdAt: article.created_at,
		attachments: article.attachments.map((attachment) => ({
			id: String(attachment.id),
			filename: attachment.filename,
			contentType: attachment.preferences["Content-Type"] ?? "application/octet-stream",
			url: `/tickets/${ticketId}/articles/${article.id}/attachments/${attachment.id}`,
		})),
	}
}

export class ListTicketMessagesUseCase implements IListTicketMessagesUseCase {
	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(userId: string, ticketId: number): Promise<TicketMessageDTO[] | null> {
		const ticket = await this.ticketRepository.findByTicketId(ticketId)

		if (!ticket || ticket.userId !== userId) {
			return null
		}

		const articles = await new Zammad(env.ZAMMAD_TOKEN).getTicketArticles(ticketId)
		return articles.map((article) => toTicketMessage(article, ticketId))
	}
}
