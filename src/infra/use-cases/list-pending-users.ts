import type { User } from "@prisma/client"
import type { IUserRepository } from "../../core/repositories/user-repository.js"
import type { IListPendingUsersUseCase } from "../../core/use-cases/list-pending-users.js"

export class ListPendingUsersUseCase implements IListPendingUsersUseCase {
	constructor(private readonly userRepository: IUserRepository) {}

	async execute(): Promise<User[]> {
		return this.userRepository.findByStatus("PENDING")
	}
}
