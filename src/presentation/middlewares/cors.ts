import fastifyCors from "@fastify/cors"
import type { FastifyInstance } from "fastify"
import fp from "fastify-plugin"
import { env } from "#env"

async function corsHandle(app: FastifyInstance) {
	app.register(fastifyCors, {
		origin: env.CLIENT_URL,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		credentials: true,
	})
}

export default fp(corsHandle)
