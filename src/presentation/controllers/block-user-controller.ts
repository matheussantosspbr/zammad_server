import type { IBlockUserUseCase } from "../../core/use-cases/block-user.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"
import { userIdParamsSchema } from "../schemas/admin-users-schema.js"

export class BlockUserController implements Controller {
	constructor(private readonly blockUserUseCase: IBlockUserUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		const parsed = userIdParamsSchema.safeParse(request.params)

		if (!parsed.success) {
			return { statusCode: 400, body: { error: parsed.error.message } }
		}

		const user = await this.blockUserUseCase.execute(parsed.data.id)
		return { statusCode: 200, body: user }
	}
}
