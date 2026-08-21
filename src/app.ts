import fastifyMultipart from "@fastify/multipart"
import Fastify, { type FastifyInstance } from "fastify"
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod"
import corsHandle from "./presentation/middlewares/cors.js"
import errorHandler from "./presentation/middlewares/error-handler.js"
import routes from "./presentation/routes/routes.js"

export function buildApp(): FastifyInstance {
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

	return app
}
