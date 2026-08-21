import { env } from "#env"

export interface ZammadUser {
	id: number
	email: string
	[key: string]: unknown
}

const USERS_PER_PAGE = 100

export default class Zammad {
	constructor(private readonly token: string) {}

	private get headers(): HeadersInit {
		return { Authorization: `Token token=${this.token}` }
	}

	async verifyToken(): Promise<boolean> {
		const response = await fetch(`${env.ZAMMAD_BASE_URL}/api/v1/users/me`, {
			headers: this.headers,
		})

		return response.ok
	}

	async listAllUsers(): Promise<ZammadUser[]> {
		const users: ZammadUser[] = []
		let page = 1

		for (;;) {
			const response = await fetch(
				`${env.ZAMMAD_BASE_URL}/api/v1/users?page=${page}&per_page=${USERS_PER_PAGE}`,
				{ headers: this.headers },
			)

			if (!response.ok) {
				throw new Error(`Zammad respondeu ${response.status} ao listar usuários`)
			}

			const pageUsers = (await response.json()) as ZammadUser[]
			users.push(...pageUsers)

			if (pageUsers.length < USERS_PER_PAGE) {
				return users
			}

			page += 1
		}
	}
}
