import { ListPendingUsersController } from "../../presentation/controllers/list-pending-users-controller.js"
import { PrismaUserRepository } from "../repositories/prisma-user-repository.js"
import { ListPendingUsersUseCase } from "../use-cases/list-pending-users.js"

export function makeListPendingUsersController(): ListPendingUsersController {
	const userRepository = new PrismaUserRepository()
	const listPendingUsersUseCase = new ListPendingUsersUseCase(userRepository)
	return new ListPendingUsersController(listPendingUsersUseCase)
}
