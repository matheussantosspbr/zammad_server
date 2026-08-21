import type { IZammadIntegrationRepository } from "../../core/repositories/zammad-integration-repository.js"
import {
	type IConnectZammadUseCase,
	InvalidZammadTokenError,
} from "../../core/use-cases/connect-zammad.js"
import { tokenCipher } from "../libs/token-cipher.js"
import Zammad from "../libs/zammad-client.js"

export class ConnectZammadUseCase implements IConnectZammadUseCase {
	constructor(private readonly zammadIntegrationRepository: IZammadIntegrationRepository) {}

	async execute(userId: string, token: string): Promise<{ last4: string }> {
		const isValid = await new Zammad(token).verifyToken()

		if (!isValid) {
			throw new InvalidZammadTokenError()
		}

		const encrypted = tokenCipher.encrypt(token)

		await this.zammadIntegrationRepository.upsert({
			userId,
			ciphertext: encrypted.ciphertext,
			iv: encrypted.iv,
			tag: encrypted.tag,
			keyVersion: encrypted.keyVersion,
			last4: encrypted.last4,
		})

		return { last4: encrypted.last4 }
	}
}
