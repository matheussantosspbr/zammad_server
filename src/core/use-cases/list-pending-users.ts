import type { User } from "@prisma/client"

export interface IListPendingUsersUseCase {
	execute(): Promise<User[]>
}
