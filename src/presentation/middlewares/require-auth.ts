import { fromNodeHeaders } from "better-auth/node"
import type { FastifyReply, FastifyRequest } from "fastify"
import { auth } from "../../infra/libs/auth.js"

declare module "fastify" {
	interface FastifyRequest {
		userId?: string
	}
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(request.headers),
	})

	if (!session) {
		return reply.code(401).send({ error: "Unauthorized" })
	}

	request.userId = session.user.id
}
