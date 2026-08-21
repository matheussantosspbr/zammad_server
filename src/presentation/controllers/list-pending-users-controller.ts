import type { IListPendingUsersUseCase } from "../../core/use-cases/list-pending-users.js"
import type { Controller, HttpRequest, HttpResponse } from "../protocols/controller.js"

export class ListPendingUsersController implements Controller {
	constructor(private readonly listPendingUsersUseCase: IListPendingUsersUseCase) {}

	async handle(_request: HttpRequest): Promise<HttpResponse> {
		const users = await this.listPendingUsersUseCase.execute()
		return { statusCode: 200, body: users }
	}
}
