import { prismaAdapter } from "@better-auth/prisma-adapter"
import { betterAuth } from "better-auth"
import { env } from "#env"
import { syncOwnerTicketsQueue } from "../queues/sync-owner-tickets-queue.js"
import { prisma } from "./prisma.js"
import Zammad from "./zammad-client.js"

const authURL = new URL(env.BETTER_AUTH_URL)
const clientURL = new URL(env.CLIENT_URL)

// O navegador só enxerga o domínio público. Em dev, front e API têm o MESMO hostname
// (localhost) — porta não muda o site — então a origem pública é `BETTER_AUTH_URL`.
// Em prod, front (Vercel) e API (Render) são sites diferentes e a API chega ao navegador
// através do proxy `/api` do front; a origem pública do fluxo vira `CLIENT_URL`. Redirecionar
// o OAuth pro host interno do Render faria o callback cair num domínio onde o cookie de
// state não existe — é o "State not persisted correctly" que você viu em produção.
export const isCrossSite = authURL.hostname !== clientURL.hostname
export const authBaseURL = isCrossSite ? env.CLIENT_URL : env.BETTER_AUTH_URL
const useSecureCookies = new URL(authBaseURL).protocol === "https:"

if (isCrossSite) {
	console.warn(
		`[auth] BETTER_AUTH_URL (${authURL.hostname}) e CLIENT_URL (${clientURL.hostname}) são sites diferentes. ` +
			`O fluxo OAuth assume que o front faz proxy de /api para a API no próprio domínio. ` +
			`Registre os redirect URIs do Google/Discord como ${env.CLIENT_URL}/api/auth/callback/{google,discord} ` +
			`e aponte o NEXT_PUBLIC_API_URL do front para ${env.CLIENT_URL}.`,
	)
}

export const auth = betterAuth({
	baseURL: authBaseURL,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.CLIENT_URL],
	onAPIError: {
		errorURL: `${env.CLIENT_URL}/?unauthorized=1`,
	},
	advanced: {
		defaultCookieAttributes: {
			// A API é servida na mesma origem que o front (via proxy /api), então o cookie
			// é de primeira parte e `lax` basta — inclusive no retorno do Google/Discord,
			// que é navegação top-level e carrega cookies Lax. Nunca usar `none` aqui:
			// exigiria cookie de terceiro, que Chrome/Firefox/Safari bloqueiam.
			sameSite: "lax",
			secure: useSecureCookies,
		},
		ipAddress: {
			// Render fica atrás de um proxy reverso; sem isso o rate limit não acha o IP
			// real do cliente e cai num bucket compartilhado único por rota.
			ipAddressHeaders: ["x-forwarded-for"],
		},
		cookies: {
			// O cookie de state nasce com Max-Age=300, mas o registro de verificação no
			// banco vale 10min. Quem demora mais de 5min na tela do Google perdia o
			// cookie e caía em "State not persisted correctly" — agora os dois expiram junto.
			state: { attributes: { maxAge: 600 } },
		},
	},
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
		discord: {
			clientId: env.DISCORD_CLIENT_ID,
			clientSecret: env.DISCORD_CLIENT_SECRET,
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const zammadUsers = await new Zammad(env.ZAMMAD_TOKEN).listAllUsers()
					const matchedZammadUser = zammadUsers.find(
						(zammadUser) => zammadUser.email.toLowerCase() === user.email.toLowerCase(),
					)

					if (!matchedZammadUser) {
						return false
					}

					const isOwner = user.email === env.OWNER_EMAIL

					return {
						data: {
							...user,
							ownerId: String(matchedZammadUser.id),
							...(isOwner ? { status: "APPROVED" } : {}),
						},
					}
				},
				after: async (user) => {
					const ownerId = user.ownerId as string | undefined

					if (user.email === env.OWNER_EMAIL && ownerId) {
						await syncOwnerTicketsQueue.add("sync-owner-tickets", {
							userId: user.id,
							zammadOwnerId: Number(ownerId),
						})
					}
				},
			},
		},
		session: {
			create: {
				before: async (session) => {
					const user = await prisma.user.findUnique({
						where: { id: session.userId },
						select: { status: true },
					})

					if (user?.status !== "APPROVED") {
						return false
					}
				},
			},
		},
		account: {
			create: {
				after: async (account) => {
					if (account.providerId === "discord") {
						await prisma.user.update({
							where: { id: account.userId },
							data: { discordUserId: account.accountId },
						})
					}
				},
			},
		},
	},
})
