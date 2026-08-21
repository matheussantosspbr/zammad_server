import type { IListMyTicketsUseCase } from "../../core/use-cases/list-my-tickets.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"

export class ListMyTicketsController implements Controller {
	constructor(private readonly listMyTicketsUseCase: IListMyTicketsUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		if (!request.userId) {
			return { statusCode: 401, body: { error: "Unauthorized" } }
		}

		const tickets = await this.listMyTicketsUseCase.execute(request.userId)
		return { statusCode: 200, body: tickets }
	}
}
