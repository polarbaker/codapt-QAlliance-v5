import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
