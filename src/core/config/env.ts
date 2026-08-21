import { z } from "zod"

/** Faixa aceita para `PORT`. Uma fonte só, para limite e mensagem não divergirem. */
const PORT_MIN = 1001
const PORT_MAX = 65535
const PORT_RANGE_MESSAGE = `PORT deve estar entre ${PORT_MIN} e ${PORT_MAX}`

const envSchema = z.object({
	APPLICATION_PORT: z.preprocess(
		(value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
		z.coerce
			.number("PORT deve ser um número")
			.int("PORT deve ser um número inteiro")
			.min(PORT_MIN, PORT_RANGE_MESSAGE)
			.max(PORT_MAX, PORT_RANGE_MESSAGE)
			.default(3333),
	),
	DATABASE_URL: z.url("DATABASE_URL deve ser uma connection string válida"),
	BETTER_AUTH_SECRET: z
		.string("BETTER_AUTH_SECRET é obrigatório")
		.min(16, "BETTER_AUTH_SECRET deve ter pelo menos 16 caracteres"),
	BETTER_AUTH_URL: z.url("BETTER_AUTH_URL deve ser uma URL válida"),
	CLIENT_URL: z.url("CLIENT_URL deve ser uma URL válida"),
	GOOGLE_CLIENT_ID: z.string("GOOGLE_CLIENT_ID é obrigatório").min(1),
	GOOGLE_CLIENT_SECRET: z.string("GOOGLE_CLIENT_SECRET é obrigatório").min(1),
	DISCORD_CLIENT_ID: z.string("DISCORD_CLIENT_ID é obrigatório").min(1),
	DISCORD_CLIENT_SECRET: z.string("DISCORD_CLIENT_SECRET é obrigatório").min(1),
	OWNER_EMAIL: z.email("OWNER_EMAIL deve ser um email válido"),
	ZAMMAD_BASE_URL: z.url("ZAMMAD_BASE_URL deve ser uma URL válida"),
	TOKEN_ENCRYPTION_KEY: z
		.string("TOKEN_ENCRYPTION_KEY é obrigatório")
		.refine(
			(value) => Buffer.from(value, "base64").length === 32,
			"TOKEN_ENCRYPTION_KEY deve ser uma chave base64 de 32 bytes (openssl rand -base64 32)",
		),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
	console.error("❌ Invalid environment variables:")
	console.error(parsed.error.message)
	process.exit(1)
}

export const env = parsed.data
