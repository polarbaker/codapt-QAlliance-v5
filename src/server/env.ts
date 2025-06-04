import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  BASE_URL: z.string().min(1, "BASE_URL is required"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long for security").default(() => {
    // Generate a secure default for development
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️  Using default JWT_SECRET for development. Set JWT_SECRET environment variable for production!");
      return "your-super-secret-jwt-key-change-in-production-this-must-be-at-least-32-chars";
    }
    throw new Error("JWT_SECRET is required in production");
  }),
});

let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
  
  // Additional validation warnings
  if (env.NODE_ENV === "production") {
    if (env.JWT_SECRET.includes("change-in-production") || env.JWT_SECRET.includes("default")) {
      console.error("🚨 SECURITY WARNING: Using default JWT_SECRET in production! Please set a secure JWT_SECRET environment variable.");
      process.exit(1);
    }
    
    if (env.ADMIN_PASSWORD.length < 8) {
      console.warn("⚠️  SECURITY WARNING: Admin password should be at least 8 characters long for production.");
    }
  }
  
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Base URL: ${env.BASE_URL}`);
  console.log(`🔐 JWT Secret: ${env.JWT_SECRET.substring(0, 8)}...`);
  
} catch (error) {
  console.error("❌ Environment validation failed:");
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  } else {
    console.error(error);
  }
  process.exit(1);
}

export { env };
