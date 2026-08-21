import { prismaAdapter } from "@better-auth/prisma-adapter"
import { betterAuth } from "better-auth"
import { env } from "#env"
import { prisma } from "./prisma.js"

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.CLIENT_URL],
	onAPIError: {
		errorURL: `${env.CLIENT_URL}/?unauthorized=1`,
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
					if (user.email === env.OWNER_EMAIL) {
						return { data: { ...user, status: "APPROVED" } }
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
