import { env } from "#env"

export async function verifyZammadToken(token: string): Promise<boolean> {
	const response = await fetch(`${env.ZAMMAD_BASE_URL}/api/v1/users/me`, {
		headers: {
			Authorization: `Token token=${token}`,
		},
	})

	return response.ok
}
