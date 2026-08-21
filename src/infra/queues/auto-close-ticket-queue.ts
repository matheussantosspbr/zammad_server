import type { TicketStatus } from "@prisma/client"
import { Queue } from "bullmq"
import { redisConnection } from "../libs/redis.js"

export interface AutoCloseTicketJobData {
	ticketId: number
	ticketNumber: string
	title: string
	ticketStatus: TicketStatus
	ticketJson: unknown
	userId: string
}

export const AUTO_CLOSE_TICKET_QUEUE = "auto-close-ticket"
export const AUTO_CLOSE_DELAY_MS = 7 * 24 * 60 * 60 * 1000

export const autoCloseTicketQueue = new Queue<AutoCloseTicketJobData>(AUTO_CLOSE_TICKET_QUEUE, {
	connection: redisConnection,
})

export function autoCloseJobId(ticketId: number): string {
	return `auto-close-${ticketId}`
}
