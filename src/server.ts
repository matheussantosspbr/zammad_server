import fastifyMultipart from "@fastify/multipart"
import Fastify from "fastify"
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod"
import { env } from "#env"
import corsHandle from "./presentation/middlewares/cors.js"
import errorHandler from "./presentation/middlewares/error-handler.js"
import routes from "./presentation/routes/routes.js"

const app = Fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(corsHandle)
app.register(fastifyMultipart, {
	attachFieldsToBody: false,
	// Sem isso, o limite de tamanho de arquivo cai no bodyLimit padrão do Fastify (1MB),
	// rejeitando qualquer foto real enviada como anexo.
	limits: { fileSize: 20 * 1024 * 1024 },
})
app.register(routes)
app.register(errorHandler)

app.listen({ port: env.APPLICATION_PORT, host: "0.0.0.0" }, (err, address) => {
	console.log(`🚀 The server is running on ${address}`)
	if (err) {
		app.log.error(err)
		process.exit(1)
	}
	// Server is now listening on ${address}
})
