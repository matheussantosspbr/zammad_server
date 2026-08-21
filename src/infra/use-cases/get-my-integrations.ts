import type { IUserRepository } from "../../core/repositories/user-repository.js"
import type { IZammadIntegrationRepository } from "../../core/repositories/zammad-integration-repository.js"
import type {
	IGetMyIntegrationsUseCase,
	MyIntegrations,
} from "../../core/use-cases/get-my-integrations.js"

export class GetMyIntegrationsUseCase implements IGetMyIntegrationsUseCase {
	constructor(
		private readonly userRepository: IUserRepository,
		private readonly zammadIntegrationRepository: IZammadIntegrationRepository,
	) {}

	async execute(userId: string): Promise<MyIntegrations> {
		const [user, zammadIntegration] = await Promise.all([
			this.userRepository.findById(userId),
			this.zammadIntegrationRepository.findByUserId(userId),
		])

		return {
			discordLinked: Boolean(user?.discordUserId),
			zammadConnected: Boolean(zammadIntegration),
			zammadLast4: zammadIntegration?.last4 ?? null,
		}
	}
}
