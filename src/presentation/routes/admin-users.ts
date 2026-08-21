import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import { makeApproveUserController } from "../../infra/factories/make-approve-user-controller.js"
import { makeBlockUserController } from "../../infra/factories/make-block-user-controller.js"
import { makeListPendingUsersController } from "../../infra/factories/make-list-pending-users-controller.js"
import { adaptRoute } from "../adapters/fastify-route-adapter.js"
import { requireOwner } from "../middlewares/require-owner.js"

export default async function adminUsersRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.get(
		"/admin/users/pending",
		{ preHandler: requireOwner },
		adaptRoute(makeListPendingUsersController()),
	)

	app.post(
		"/admin/users/:id/approve",
		{ preHandler: requireOwner },
		adaptRoute(makeApproveUserController()),
	)

	app.post(
		"/admin/users/:id/block",
		{ preHandler: requireOwner },
		adaptRoute(makeBlockUserController()),
	)
}
