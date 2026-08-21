import { env } from "#env"

export interface ZammadUser {
	id: number
	email: string
	[key: string]: unknown
}

export interface ZammadTicket {
	id: number
	number: string
	title: string
	state: string
	owner_id: number
	customer_id: number
	[key: string]: unknown
}

interface ZammadTicketSearchResponse {
	records: ZammadTicket[]
	total_count: number
}

export interface ZammadArticleAttachment {
	id: number
	store_file_id: number
	filename: string
	size: string
	preferences: { "Content-Type"?: string; [key: string]: unknown }
}

export interface ZammadArticle {
	id: number
	ticket_id: number
	from: string
	body: string
	content_type: string
	internal: boolean
	sender: "Agent" | "Customer" | "System"
	created_at: string
	attachments: ZammadArticleAttachment[]
	[key: string]: unknown
}

export interface ZammadAttachmentFile {
	buffer: Buffer
	contentType: string
	filename: string
}

const USERS_PER_PAGE = 100
const TICKETS_PER_PAGE = 100

export default class Zammad {
	constructor(private readonly token: string) {}

	private get headers(): HeadersInit {
		return { Authorization: `Token token=${this.token}` }
	}

	async verifyToken(): Promise<boolean> {
		const response = await fetch(`${env.ZAMMAD_BASE_URL}/api/v1/users/me`, {
			headers: this.headers,
		})

		return response.ok
	}

	async listAllUsers(): Promise<ZammadUser[]> {
		const users: ZammadUser[] = []
		let page = 1

		for (;;) {
			const response = await fetch(
				`${env.ZAMMAD_BASE_URL}/api/v1/users?page=${page}&per_page=${USERS_PER_PAGE}`,
				{ headers: this.headers },
			)

			if (!response.ok) {
				throw new Error(`Zammad respondeu ${response.status} ao listar usuários`)
			}

			const pageUsers = (await response.json()) as ZammadUser[]
			users.push(...pageUsers)

			if (pageUsers.length < USERS_PER_PAGE) {
				return users
			}

			page += 1
		}
	}

	async searchTicketsByOwner(ownerId: number): Promise<ZammadTicket[]> {
		const tickets: ZammadTicket[] = []
		let page = 1

		for (;;) {
			const params = new URLSearchParams({
				"condition[ticket.owner_id][operator]": "is",
				"condition[ticket.owner_id][value]": String(ownerId),
				expand: "true",
				page: String(page),
				per_page: String(TICKETS_PER_PAGE),
				with_total_count: "true",
			})

			const response = await fetch(`${env.ZAMMAD_BASE_URL}/api/v1/tickets/search?${params}`, {
				headers: this.headers,
			})

			if (!response.ok) {
				throw new Error(`Zammad respondeu ${response.status} ao buscar tickets`)
			}

			const result = (await response.json()) as ZammadTicketSearchResponse
			tickets.push(...result.records)

			if (result.records.length < TICKETS_PER_PAGE) {
				return tickets
			}

			page += 1
		}
	}

	async getTicketArticles(ticketId: number): Promise<ZammadArticle[]> {
		const response = await fetch(
			`${env.ZAMMAD_BASE_URL}/api/v1/ticket_articles/by_ticket/${ticketId}`,
			{ headers: this.headers },
		)

		if (!response.ok) {
			throw new Error(`Zammad respondeu ${response.status} ao buscar mensagens do ticket`)
		}

		return (await response.json()) as ZammadArticle[]
	}

	async getAttachment(
		ticketId: number,
		articleId: number,
		attachmentId: number,
	): Promise<ZammadAttachmentFile> {
		const response = await fetch(
			`${env.ZAMMAD_BASE_URL}/api/v1/ticket_attachment/${ticketId}/${articleId}/${attachmentId}`,
			{ headers: this.headers },
		)

		if (!response.ok) {
			throw new Error(`Zammad respondeu ${response.status} ao buscar anexo`)
		}

		const buffer = Buffer.from(await response.arrayBuffer())
		const contentType = response.headers.get("content-type") ?? "application/octet-stream"
		const disposition = response.headers.get("content-disposition") ?? ""
		const filenameMatch = disposition.match(/filename="?([^";]+)"?/)
		const rawFilename = filenameMatch?.[1]

		return {
			buffer,
			contentType,
			filename: rawFilename ? decodeURIComponent(rawFilename) : `attachment-${attachmentId}`,
		}
	}
}
