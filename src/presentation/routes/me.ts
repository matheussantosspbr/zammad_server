import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import { makeConnectZammadController } from "../../infra/factories/make-connect-zammad-controller.js"
import { makeGetMyIntegrationsController } from "../../infra/factories/make-get-my-integrations-controller.js"
import { adaptRoute } from "../adapters/fastify-route-adapter.js"
import { requireAuth } from "../middlewares/require-auth.js"

export default async function meRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.get(
		"/me/integrations",
		{ preHandler: requireAuth },
		adaptRoute(makeGetMyIntegrationsController()),
	)

	app.post(
		"/me/integrations/zammad",
		{ preHandler: requireAuth },
		adaptRoute(makeConnectZammadController()),
	)
}
