import type { TicketMessageDTO } from "../../core/use-cases/list-ticket-messages.js"
import type { ZammadArticle } from "./zammad-client.js"

function extractAuthorName(from: string): string {
	return from.replace(/\s*<[^>]+>\s*$/, "").trim()
}

export function toTicketMessage(article: ZammadArticle, ticketId: number): TicketMessageDTO {
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

export function mapArticlesToMessages(
	articles: ZammadArticle[],
	ticketId: number,
): TicketMessageDTO[] {
	return articles.map((article) => toTicketMessage(article, ticketId))
}

const HTML_ENTITIES: Record<string, string> = {
	"&nbsp;": " ",
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
}

export function toPlainTextPreview(message: TicketMessageDTO, maxLength = 140): string {
	const text = message.contentType.includes("html")
		? message.content.replace(/<[^>]+>/g, " ")
		: message.content

	const decoded = text.replace(
		/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g,
		(entity) => HTML_ENTITIES[entity],
	)
	const normalized = decoded.replace(/\s+/g, " ").trim()

	return normalized.length > maxLength
		? `${normalized.slice(0, maxLength).trimEnd()}…`
		: normalized
}
