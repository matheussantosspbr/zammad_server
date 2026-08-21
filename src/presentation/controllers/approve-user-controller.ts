import type { IApproveUserUseCase } from "../../core/use-cases/approve-user.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"
import { userIdParamsSchema } from "../schemas/admin-users-schema.js"

export class ApproveUserController implements Controller {
	constructor(private readonly approveUserUseCase: IApproveUserUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		const parsed = userIdParamsSchema.safeParse(request.params)

		if (!parsed.success) {
			return { statusCode: 400, body: { error: parsed.error.message } }
		}

		const user = await this.approveUserUseCase.execute(parsed.data.id)
		return { statusCode: 200, body: user }
	}
}
