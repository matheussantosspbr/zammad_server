import type { IGetMyIntegrationsUseCase } from "../../core/use-cases/get-my-integrations.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"

export class GetMyIntegrationsController implements Controller {
	constructor(private readonly getMyIntegrationsUseCase: IGetMyIntegrationsUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		if (!request.userId) {
			return { statusCode: 401, body: { error: "Unauthorized" } }
		}

		const integrations = await this.getMyIntegrationsUseCase.execute(request.userId)
		return { statusCode: 200, body: integrations }
	}
}
