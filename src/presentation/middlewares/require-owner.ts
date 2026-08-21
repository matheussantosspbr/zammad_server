import { fromNodeHeaders } from "better-auth/node"
import type { FastifyReply, FastifyRequest } from "fastify"
import { env } from "#env"
import { auth } from "../../infra/libs/auth.js"

export async function requireOwner(request: FastifyRequest, reply: FastifyReply) {
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(request.headers),
	})

	if (!session) {
		return reply.code(401).send({ error: "Unauthorized" })
	}

	if (session.user.email !== env.OWNER_EMAIL) {
		return reply.code(403).send({ error: "Forbidden" })
	}
}
