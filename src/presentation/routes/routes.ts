import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import adminUsersRoutes from "./admin-users.js"
import authRoutes from "./auth.js"
import meRoutes from "./me.js"

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.register(authRoutes)
	app.register(adminUsersRoutes)
	app.register(meRoutes)
}
