import { ApproveUserController } from "../../presentation/controllers/approve-user-controller.js"
import { PrismaUserRepository } from "../repositories/prisma-user-repository.js"
import { ApproveUserUseCase } from "../use-cases/approve-user.js"

export function makeApproveUserController(): ApproveUserController {
	const userRepository = new PrismaUserRepository()
	const approveUserUseCase = new ApproveUserUseCase(userRepository)
	return new ApproveUserController(approveUserUseCase)
}
