import { BlockUserController } from "../../presentation/controllers/block-user-controller.js"
import { PrismaUserRepository } from "../repositories/prisma-user-repository.js"
import { BlockUserUseCase } from "../use-cases/block-user.js"

export function makeBlockUserController(): BlockUserController {
	const userRepository = new PrismaUserRepository()
	const blockUserUseCase = new BlockUserUseCase(userRepository)
	return new BlockUserController(blockUserUseCase)
}
