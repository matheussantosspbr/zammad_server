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
	// Em produção a app fica atrás do proxy do Render; sem trustProxy o `request.ip`
	// é o IP do proxy, e o rate limit do Better Auth vira um balde global por rota.
	// `1` = confia só no hop mais próximo, então um `x-forwarded-for` forjado pelo
	// cliente não consegue se passar por outro IP.
	// Confia só no hop mais próximo (equivalente a `trustProxy: 1`, que os tipos do
	// Fastify não aceitam): um `x-forwarded-for` forjado pelo cliente não passa.
	const app = Fastify({ trustProxy: (_address, hop) => hop === 0 }).withTypeProvider<
		ZodTypeProvider
	>()

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
