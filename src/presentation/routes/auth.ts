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
			// O `auth.handler` recebe um Request web-standard, que não carrega socket —
			// o IP do cliente só chega até o rate limit via header. Sobrescrever com o
			// `request.ip` já resolvido pelo Fastify cobre o dev (sem proxy) e impede
			// que o valor original do cliente seja usado.
			headers.set("x-forwarded-for", request.ip)
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
