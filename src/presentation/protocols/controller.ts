export interface HttpRequestFile {
	filename: string
	mimeType: string
	buffer: Buffer
}

export interface HttpRequest {
	params?: Record<string, string>
	body?: unknown
	userId?: string
	files?: HttpRequestFile[]
}

export interface HttpResponse<T = unknown> {
	statusCode: number
	body: T
}

export interface Controller {
	handle(request: HttpRequest): Promise<HttpResponse>
}
