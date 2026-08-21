import type { FastifyReply, FastifyRequest } from "fastify"
import type { Controller, HttpRequestFile } from "../protocols/controller.js"

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

export function adaptMultipartRoute(controller: Controller) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const body: Record<string, string> = {}
		const files: HttpRequestFile[] = []

		for await (const part of request.parts()) {
			if (part.type === "file") {
				files.push({
					filename: part.filename,
					mimeType: part.mimetype,
					buffer: await part.toBuffer(),
				})
			} else {
				body[part.fieldname] = part.value as string
			}
		}

		const httpResponse = await controller.handle({
			params: request.params as Record<string, string>,
			body,
			userId: request.userId,
			files,
		})

		reply.status(httpResponse.statusCode).send(httpResponse.body)
	}
}
