import { z } from "zod";

/** Faixa aceita para `PORT`. Uma fonte só, para limite e mensagem não divergirem. */
const PORT_MIN = 1001;
const PORT_MAX = 65535;
const PORT_RANGE_MESSAGE = `PORT deve estar entre ${PORT_MIN} e ${PORT_MAX}`;

const envSchema = z.object({
    APPLICATION_PORT: z.preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
        z.coerce
            .number("PORT deve ser um número")
            .int("PORT deve ser um número inteiro")
            .min(PORT_MIN, PORT_RANGE_MESSAGE)
            .max(PORT_MAX, PORT_RANGE_MESSAGE)
            .default(3333),
    )
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.message)
    process.exit(1);
}

export const env = parsed.data;
