export interface HttpRequest {
	params?: Record<string, string>
	body?: unknown
	userId?: string
}

export interface HttpResponse<T = unknown> {
	statusCode: number
	body: T
}

export interface Controller {
	handle(request: HttpRequest): Promise<HttpResponse>
}
