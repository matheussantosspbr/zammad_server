import {
	type IConnectZammadUseCase,
	InvalidZammadTokenError,
} from "../../core/use-cases/connect-zammad.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"
import { connectZammadBodySchema } from "../schemas/zammad-integration-schema.js"

export class ConnectZammadController implements Controller {
	constructor(private readonly connectZammadUseCase: IConnectZammadUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		if (!request.userId) {
			return { statusCode: 401, body: { error: "Unauthorized" } }
		}

		const parsed = connectZammadBodySchema.safeParse(request.body)

		if (!parsed.success) {
			return { statusCode: 400, body: { error: parsed.error.message } }
		}

		try {
			const result = await this.connectZammadUseCase.execute(
				request.userId,
				parsed.data.token,
			)
			return { statusCode: 200, body: result }
		} catch (error) {
			if (error instanceof InvalidZammadTokenError) {
				return { statusCode: 400, body: { error: error.message } }
			}
			throw error
		}
	}
}
