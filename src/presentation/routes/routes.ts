import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import adminUsersRoutes from "./admin-users.js"
import authRoutes from "./auth.js"
import meRoutes from "./me.js"
import ticketsRoutes from "./tickets.js"

async function apiRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.register(adminUsersRoutes)
	app.register(meRoutes)
	app.register(ticketsRoutes)
}

export default async function routes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	// O auth já se registra em /api/auth/*.
	app.register(authRoutes)

	// Tudo sob /api para que o front possa proxiar um único prefixo e servir a API no
	// mesmo domínio — sem isso o cookie de sessão é de terceiro e os navegadores que
	// bloqueiam cookie cross-site derrubam o login.
	app.register(apiRoutes, { prefix: "/api" })

	// Compatibilidade temporária: o client em produção ainda chama /me, /admin e /tickets
	// sem prefixo. Remover depois que o deploy do front com /api estiver no ar.
	app.register(apiRoutes)
}
