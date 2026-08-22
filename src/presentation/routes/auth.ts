import { fromNodeHeaders } from "better-auth/node"
import type { FastifyInstance, FastifyPluginOptions } from "fastify"
import { auth, authBaseURL } from "../../infra/libs/auth.js"

export default async function authRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
	app.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
		async handler(request, reply) {
			// A URL precisa ser a origem pública do Better Auth, não o Host da requisição:
			// atrás de um proxy (Vercel reescrevendo /api para cá) o Host que chega é o
			// interno, e o que vale para cookies e redirects é o domínio que o navegador vê.
			const url = new URL(request.url, authBaseURL)
			const headers = fromNodeHeaders(request.headers)
			// O `auth.handler` recebe um Request web-standard, que não carrega socket —
			// o IP do cliente só chega até o rate limit via header. Sobrescrever com o
			// `request.ip` já resolvido pelo Fastify cobre o dev (sem proxy) e impede
			// que o valor original do cliente seja usado.
			headers.set("x-forwarded-for", request.ip)
			const req = new Request(url, {
				method: request.method,
				headers,
				...(request.body ? { body: JSON.stringify(request.body) } : {}),
			})

			const response = await auth.handler(req)

			// Diagnóstico temporário do fluxo OAuth: o erro "State not persisted correctly"
			// só diz que o cookie de state não voltou. Estes dois logs mostram em qual host
			// ele foi gravado e em qual host ele era esperado — se forem diferentes, é aí
			// que o login quebra. Remover quando o fluxo estiver estável.
			if (url.pathname.includes("/sign-in/social") || url.pathname.includes("/callback/")) {
				const cookieNames = (request.headers.cookie ?? "")
					.split(";")
					.map((part) => part.split("=")[0]?.trim())
					.filter((name) => name?.includes("better-auth"))
				console.log("[oauth-debug]", {
					path: url.pathname,
					host: request.headers.host,
					protocol: request.protocol,
					origin: request.headers.origin ?? null,
					referer: request.headers.referer ?? null,
					cookiesRecebidos: cookieNames,
					cookiesGravados: response.headers
						.getSetCookie()
						.map((cookie: string) => cookie.split("=")[0]),
					status: response.status,
				})
			}

			reply.status(response.status)
			response.headers.forEach((value, key) => {
				reply.header(key, value)
			})
			reply.send(response.body ? await response.text() : null)
		},
	})
}
