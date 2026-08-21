import type { ZammadIntegration } from "@prisma/client"
import type {
	IZammadIntegrationRepository,
	SaveZammadIntegrationInput,
} from "../../core/repositories/zammad-integration-repository.js"
import { prisma } from "../libs/prisma.js"

export class PrismaZammadIntegrationRepository implements IZammadIntegrationRepository {
	async findByUserId(userId: string): Promise<ZammadIntegration | null> {
		return prisma.zammadIntegration.findUnique({ where: { userId } })
	}

	async upsert(input: SaveZammadIntegrationInput): Promise<ZammadIntegration> {
		const { userId, ...data } = input
		return prisma.zammadIntegration.upsert({
			where: { userId },
			create: { userId, ...data },
			update: data,
		})
	}
}
