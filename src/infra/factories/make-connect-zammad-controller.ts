import { ConnectZammadController } from "../../presentation/controllers/connect-zammad-controller.js"
import { PrismaZammadIntegrationRepository } from "../repositories/prisma-zammad-integration-repository.js"
import { ConnectZammadUseCase } from "../use-cases/connect-zammad.js"

export function makeConnectZammadController(): ConnectZammadController {
	const zammadIntegrationRepository = new PrismaZammadIntegrationRepository()
	const connectZammadUseCase = new ConnectZammadUseCase(zammadIntegrationRepository)
	return new ConnectZammadController(connectZammadUseCase)
}
