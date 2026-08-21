import type { FastifyReply, FastifyRequest } from "fastify"
import type { Controller } from "../protocols/controller.js"

export function adaptRoute(controller: Controller) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const httpResponse = await controller.handle({
			params: request.params as Record<string, string>,
			body: request.body,
			userId: request.userId,
		})

		reply.status(httpResponse.statusCode).send(httpResponse.body)
	}
}
