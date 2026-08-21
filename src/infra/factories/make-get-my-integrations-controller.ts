import { GetMyIntegrationsController } from "../../presentation/controllers/get-my-integrations-controller.js"
import { PrismaUserRepository } from "../repositories/prisma-user-repository.js"
import { PrismaZammadIntegrationRepository } from "../repositories/prisma-zammad-integration-repository.js"
import { GetMyIntegrationsUseCase } from "../use-cases/get-my-integrations.js"

export function makeGetMyIntegrationsController(): GetMyIntegrationsController {
	const userRepository = new PrismaUserRepository()
	const zammadIntegrationRepository = new PrismaZammadIntegrationRepository()
	const getMyIntegrationsUseCase = new GetMyIntegrationsUseCase(
		userRepository,
		zammadIntegrationRepository,
	)
	return new GetMyIntegrationsController(getMyIntegrationsUseCase)
}
