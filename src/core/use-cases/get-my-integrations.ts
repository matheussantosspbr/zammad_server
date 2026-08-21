export interface MyIntegrations {
	discordLinked: boolean
	zammadConnected: boolean
	zammadLast4: string | null
}

export interface IGetMyIntegrationsUseCase {
	execute(userId: string): Promise<MyIntegrations>
}
