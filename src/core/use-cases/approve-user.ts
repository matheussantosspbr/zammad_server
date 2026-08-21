import type { User } from "@prisma/client"

export interface IApproveUserUseCase {
	execute(id: string): Promise<User>
}
