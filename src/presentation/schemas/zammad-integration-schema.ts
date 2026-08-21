import { z } from "zod"

export const connectZammadBodySchema = z.object({
	token: z.string().min(1, "token é obrigatório"),
})
