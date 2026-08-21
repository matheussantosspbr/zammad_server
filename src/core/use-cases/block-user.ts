import type { User } from "@prisma/client"

export interface IBlockUserUseCase {
	execute(id: string): Promise<User>
}
