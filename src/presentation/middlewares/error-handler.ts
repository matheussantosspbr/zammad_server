import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify'

export default async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler(function (
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    app.log.error(error)

    if (error.validation) {
      return reply.status(400).send({
        message: 'Erro de validação',
        details: error.validation
      })
    }

    reply.status(error.statusCode ?? 500).send({
      message: error.message || 'Erro interno do servidor'
    })
  })
}
