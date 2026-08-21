import type { Prisma, Tickets } from "@prisma/client"
import type {
	ITicketRepository,
	UpsertTicketInput,
} from "../../core/repositories/ticket-repository.js"
import { prisma } from "../libs/prisma.js"

export class PrismaTicketRepository implements ITicketRepository {
	async upsertByTicketId(input: UpsertTicketInput): Promise<void> {
		const { ticketId, ticketNumber, title, ticketStatus, userId } = input
		const ticketJson = input.ticketJson as Prisma.InputJsonValue

		await prisma.tickets.upsert({
			where: { ticketId },
			create: { ticketId, ticketNumber, title, ticketStatus, ticketJson, userId },
			update: { ticketNumber, title, ticketStatus, ticketJson },
		})
	}

	async findByUserId(userId: string): Promise<Tickets[]> {
		return prisma.tickets.findMany({ where: { userId } })
	}
}
