import Fastify from 'fastify'
import { env } from '#env'
import routes from './presentation/routes/routes'
import errorHandler from './presentation/middlewares/error-handler'

const app = Fastify()

app.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

app.register(routes)
app.register(errorHandler)

app.listen({ port: env.APPLICATION_PORT, host: '0.0.0.0'}, function (err, address) {
	console.log(address)
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})
