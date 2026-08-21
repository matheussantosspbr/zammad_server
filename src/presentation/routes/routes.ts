import type { FastifyInstance, FastifyPluginOptions } from "fastify"

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.get("/", async (_request, reply) => {
		reply.send({ hello: "world" })
	})

	app.get<{ Params: { name: string } }>("/hello/:name", async (request, reply) => {
		reply.send({ hello: request.params.name })
	})
}
