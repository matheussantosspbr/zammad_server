import type { TicketStatus } from "@prisma/client"

export type FrontendTicketStatus = "OPEN" | "PENDING" | "CLOSED"

export function toFrontendTicketStatus(status: TicketStatus): FrontendTicketStatus {
	switch (status) {
		case "new":
		case "open":
			return "OPEN"
		case "pending_reminder":
		case "pending_close":
			return "PENDING"
		case "closed":
			return "CLOSED"
	}
}

/** Converte o `state` cru do Zammad (com espaço) pro enum do Prisma (com `_`). */
export function toPrismaTicketStatus(zammadState: string): TicketStatus {
	return zammadState.replace(/ /g, "_") as TicketStatus
}
