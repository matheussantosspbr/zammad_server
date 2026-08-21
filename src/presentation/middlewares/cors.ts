import fastifyCors from "@fastify/cors";
import { FastifyInstance } from "fastify";

export default async function corsHandle(app: FastifyInstance){
	app.register(fastifyCors, {
		origin: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		credentials: true
	})

}
