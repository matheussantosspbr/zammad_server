import type { ZammadIntegration } from "@prisma/client"

export interface SaveZammadIntegrationInput {
	userId: string
	ciphertext: string
	iv: string
	tag: string
	keyVersion: number
	last4: string
}

export interface IZammadIntegrationRepository {
	findByUserId(userId: string): Promise<ZammadIntegration | null>
	upsert(input: SaveZammadIntegrationInput): Promise<ZammadIntegration>
}
