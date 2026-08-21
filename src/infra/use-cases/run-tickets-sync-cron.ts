import type { Tickets } from "@prisma/client"
import { env } from "#env"
import { toFrontendTicketStatus, toPrismaTicketStatus } from "../../core/entities/ticket-status.js"
import type { ITicketRepository } from "../../core/repositories/ticket-repository.js"
import type { TicketMessageDTO } from "../../core/use-cases/list-ticket-messages.js"
import { mapArticlesToMessages } from "../libs/ticket-message-mapper.js"
import Zammad from "../libs/zammad-client.js"
import {
	AUTO_CLOSE_DELAY_MS,
	autoCloseJobId,
	autoCloseTicketQueue,
} from "../queues/auto-close-ticket-queue.js"

const PARK_AFTER_MS = 7 * 24 * 60 * 60 * 1000

interface StoredTicketJson {
	messages?: TicketMessageDTO[]
}

export class RunTicketsSyncCronUseCase {
	private readonly zammad = new Zammad(env.ZAMMAD_TOKEN)

	constructor(private readonly ticketRepository: ITicketRepository) {}

	async execute(): Promise<void> {
		await this.syncActiveTickets()
		await this.revisitParkedTickets()
	}

	private async syncActiveTickets(): Promise<void> {
		const tickets = await this.ticketRepository.findAll()

		for (const ticket of tickets) {
			const [freshTicket, articles] = await Promise.all([
				this.zammad.getTicket(ticket.ticketId),
				this.zammad.getTicketArticles(ticket.ticketId),
			])

			const freshMessages = mapArticlesToMessages(articles, ticket.ticketId)
			const freshStatus = toPrismaTicketStatus(freshTicket.state)
			const storedMessages = (ticket.ticketJson as StoredTicketJson).messages ?? []

			const hasChanged =
				freshStatus !== ticket.ticketStatus ||
				freshMessages.length !== storedMessages.length ||
				freshMessages.at(-1)?.id !== storedMessages.at(-1)?.id

			if (hasChanged) {
				await this.ticketRepository.upsertByTicketId({
					ticketId: freshTicket.id,
					ticketNumber: freshTicket.number,
					title: freshTicket.title,
					ticketStatus: freshStatus,
					ticketJson: { ...freshTicket, messages: freshMessages },
					userId: ticket.userId,
				})
			}

			await this.maybeParkTicket(ticket, freshStatus, freshMessages)
		}
	}

	private async maybeParkTicket(
		ticket: Tickets,
		freshStatus: Tickets["ticketStatus"],
		messages: TicketMessageDTO[],
	): Promise<void> {
		if (toFrontendTicketStatus(freshStatus) === "CLOSED") return

		const lastMessage = messages.at(-1)
		if (lastMessage?.author !== "user") return

		const sinceLastReplyMs = Date.now() - new Date(lastMessage.createdAt).getTime()
		if (sinceLastReplyMs < PARK_AFTER_MS) return

		await autoCloseTicketQueue.add(
			"auto-close",
			{
				ticketId: ticket.ticketId,
				ticketNumber: ticket.ticketNumber,
				title: ticket.title,
				ticketStatus: freshStatus,
				ticketJson: ticket.ticketJson,
				userId: ticket.userId,
			},
			{ delay: AUTO_CLOSE_DELAY_MS, jobId: autoCloseJobId(ticket.ticketId) },
		)

		await this.ticketRepository.deleteByTicketId(ticket.ticketId)
	}

	private async revisitParkedTickets(): Promise<void> {
		const delayedJobs = await autoCloseTicketQueue.getDelayed()

		for (const job of delayedJobs) {
			const [freshTicket, articles] = await Promise.all([
				this.zammad.getTicket(job.data.ticketId),
				this.zammad.getTicketArticles(job.data.ticketId),
			])

			const freshMessages = mapArticlesToMessages(articles, job.data.ticketId)
			const freshStatus = toPrismaTicketStatus(freshTicket.state)
			const lastMessage = freshMessages.at(-1)
			const stillWaitingOnCustomer = lastMessage?.author === "user"
			const stillActive = toFrontendTicketStatus(freshStatus) !== "CLOSED"

			if (stillWaitingOnCustomer && stillActive) {
				continue
			}

			await job.remove()
			await this.ticketRepository.upsertByTicketId({
				ticketId: freshTicket.id,
				ticketNumber: freshTicket.number,
				title: freshTicket.title,
				ticketStatus: freshStatus,
				ticketJson: { ...freshTicket, messages: freshMessages },
				userId: job.data.userId,
			})
		}
	}
}
