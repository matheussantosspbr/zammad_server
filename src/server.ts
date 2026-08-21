import Fastify from 'fastify'
import { env } from '#env'
import routes from './presentation/routes/routes'
import errorHandler from './presentation/middlewares/error-handler'
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import corsHandle from './presentation/middlewares/cors'

const app = Fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(corsHandle)
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
