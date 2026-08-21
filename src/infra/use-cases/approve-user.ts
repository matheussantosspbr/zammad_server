import type { User } from "@prisma/client"
import type { IUserRepository } from "../../core/repositories/user-repository.js"
import type { IApproveUserUseCase } from "../../core/use-cases/approve-user.js"

export class ApproveUserUseCase implements IApproveUserUseCase {
	constructor(private readonly userRepository: IUserRepository) {}

	async execute(id: string): Promise<User> {
		return this.userRepository.updateStatus(id, "APPROVED")
	}
}
