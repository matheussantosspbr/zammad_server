import type { User } from "@prisma/client"
import type { IUserRepository } from "../../core/repositories/user-repository.js"
import type { IBlockUserUseCase } from "../../core/use-cases/block-user.js"

export class BlockUserUseCase implements IBlockUserUseCase {
	constructor(private readonly userRepository: IUserRepository) {}

	async execute(id: string): Promise<User> {
		return this.userRepository.updateStatus(id, "BLOCKED")
	}
}
