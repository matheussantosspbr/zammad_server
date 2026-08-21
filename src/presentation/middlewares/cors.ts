import fastifyCors from "@fastify/cors"
import type { FastifyInstance } from "fastify"

export default async function corsHandle(app: FastifyInstance) {
	app.register(fastifyCors, {
		origin: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		credentials: true,
	})
}
