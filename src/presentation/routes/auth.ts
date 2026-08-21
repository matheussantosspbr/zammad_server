import { fromNodeHeaders } from "better-auth/node"
import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import { auth } from "../../infra/libs/auth.js"

export default async function authRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
		async handler(request, reply) {
			const url = new URL(request.url, `http://${request.headers.host}`)
			const headers = fromNodeHeaders(request.headers)
			const req = new Request(url, {
				method: request.method,
				headers,
				...(request.body ? { body: JSON.stringify(request.body) } : {}),
			})

			const response = await auth.handler(req)

			reply.status(response.status)
			response.headers.forEach((value, key) => {
				reply.header(key, value)
			})
			reply.send(response.body ? await response.text() : null)
		},
	})
}
