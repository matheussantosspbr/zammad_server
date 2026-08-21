import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { env } from "#env"

/** Token em repouso cifrado com AES-256-GCM e `keyVersion` (permite rotação futura da chave). */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH_BYTES = 12
const KEY_VERSION = 1

export type EncryptedToken = Readonly<{
	ciphertext: string
	iv: string
	tag: string
	keyVersion: number
	last4: string
}>

export class TokenCipher {
	private readonly key: Buffer
	private readonly keyVersion: number

	constructor(keyBase64: string, keyVersion: number) {
		const key = Buffer.from(keyBase64, "base64")
		if (key.length !== 32) {
			throw new Error("TOKEN_ENCRYPTION_KEY deve decodificar para 32 bytes (AES-256).")
		}
		this.key = key
		this.keyVersion = keyVersion
	}

	encrypt(plainToken: string): EncryptedToken {
		const iv = randomBytes(IV_LENGTH_BYTES)
		const cipher = createCipheriv(ALGORITHM, this.key, iv)
		const ciphertext = Buffer.concat([cipher.update(plainToken, "utf8"), cipher.final()])
		const tag = cipher.getAuthTag()

		return {
			ciphertext: ciphertext.toString("base64"),
			iv: iv.toString("base64"),
			tag: tag.toString("base64"),
			keyVersion: this.keyVersion,
			last4: plainToken.slice(-4),
		}
	}

	decrypt(encrypted: Omit<EncryptedToken, "last4" | "keyVersion">): string {
		const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(encrypted.iv, "base64"))
		decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"))
		const plaintext = Buffer.concat([
			decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
			decipher.final(),
		])
		return plaintext.toString("utf8")
	}
}

export const tokenCipher = new TokenCipher(env.TOKEN_ENCRYPTION_KEY, KEY_VERSION)
