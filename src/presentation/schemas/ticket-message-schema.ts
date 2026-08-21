import { z } from "zod"

export const sendTicketMessageBodySchema = z.object({
	body: z.string().max(10000).optional().default(""),
})
