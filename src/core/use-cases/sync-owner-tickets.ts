export interface ISyncOwnerTicketsUseCase {
	execute(userId: string, zammadOwnerId: number): Promise<void>
}
