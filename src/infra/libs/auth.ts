import { prismaAdapter } from "@better-auth/prisma-adapter"
import { betterAuth } from "better-auth"
import { env } from "#env"
import { syncOwnerTicketsQueue } from "../queues/sync-owner-tickets-queue.js"
import { prisma } from "./prisma.js"
import Zammad from "./zammad-client.js"

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.CLIENT_URL],
	onAPIError: {
		errorURL: `${env.CLIENT_URL}/?unauthorized=1`,
	},
	advanced: {
		// Front (Vercel) e back (Render) são domínios diferentes de verdade em produção —
		// sem isso, o navegador recusa persistir o cookie de state/sessão em requisições
		// cross-site, e o login OAuth quebra com "State not persisted correctly".
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
		},
		ipAddress: {
			// Render fica atrás de um proxy reverso; sem isso o rate limit não acha o IP
			// real do cliente e cai num bucket compartilhado único por rota.
			ipAddressHeaders: ["x-forwarded-for"],
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
