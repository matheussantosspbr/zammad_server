import { env } from "#env"
import { buildApp } from "./app.js"

const app = buildApp()

app.listen({ port: env.APPLICATION_PORT, host: "0.0.0.0" }, (err, address) => {
	console.log(`🚀 The server is running on ${address}`)
	if (err) {
		app.log.error(err)
		process.exit(1)
	}
	// Server is now listening on ${address}
})
