import { FastifyInstance, FastifyPluginOptions } from 'fastify'

export default async function routes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  app.get('/', async (request, reply) => {
    reply.send({ hello: 'world' })
  })

  app.get<{ Params: { name: string } }>(
    '/hello/:name',
    async (request, reply) => {
      reply.send({ hello: request.params.name })
    }
  )
}
