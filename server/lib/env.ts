import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().optional(),
  BCRYPT_SALT_ROUNDS: z.string().default("12"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  NODEMAILER_HOST: z.string().optional(),
  NODEMAILER_USER: z.string().optional(),
  NODEMAILER_PASS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
