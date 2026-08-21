export interface IConnectZammadUseCase {
	execute(userId: string, token: string): Promise<{ last4: string }>
}

export class InvalidZammadTokenError extends Error {
	constructor() {
		super("Token do Zammad inválido")
		this.name = "InvalidZammadTokenError"
	}
}
