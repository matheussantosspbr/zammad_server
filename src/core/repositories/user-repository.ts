import type { User, UserStatus } from "@prisma/client"

export interface IUserRepository {
	findByStatus(status: UserStatus): Promise<User[]>
	updateStatus(id: string, status: UserStatus): Promise<User>
}
