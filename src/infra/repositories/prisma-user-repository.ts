import type { User, UserStatus } from "@prisma/client"
import type { IUserRepository } from "../../core/repositories/user-repository.js"
import { prisma } from "../libs/prisma.js"

export class PrismaUserRepository implements IUserRepository {
	async findByStatus(status: UserStatus): Promise<User[]> {
		return prisma.user.findMany({ where: { status } })
	}

	async updateStatus(id: string, status: UserStatus): Promise<User> {
		return prisma.user.update({ where: { id }, data: { status } })
	}
}
