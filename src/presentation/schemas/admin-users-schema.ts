import { z } from "zod"

export const userIdParamsSchema = z.object({
	id: z.string().min(1, "id é obrigatório"),
})
