export interface MyTicketStats {
	total: number
	open: number
	pending: number
	closed: number
}

export interface IGetMyTicketStatsUseCase {
	execute(userId: string): Promise<MyTicketStats>
}
