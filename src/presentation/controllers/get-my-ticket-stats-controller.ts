import type { IGetMyTicketStatsUseCase } from "../../core/use-cases/get-my-ticket-stats.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"

export class GetMyTicketStatsController implements Controller {
	constructor(private readonly getMyTicketStatsUseCase: IGetMyTicketStatsUseCase) {}

	async handle(request: HttpRequest): Promise<HttpResponse> {
		if (!request.userId) {
			return { statusCode: 401, body: { error: "Unauthorized" } }
		}

		const stats = await this.getMyTicketStatsUseCase.execute(request.userId)
		return { statusCode: 200, body: stats }
	}
}
