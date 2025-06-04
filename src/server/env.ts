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
  
  // Enhanced upload configuration
  UPLOAD_MAX_FILE_SIZE: z.string().default("200").transform(val => parseInt(val) * 1024 * 1024), // 200MB default
  UPLOAD_CHUNK_SIZE: z.string().default("2").transform(val => parseInt(val) * 1024 * 1024), // 2MB default chunks
  UPLOAD_MAX_CHUNKS: z.string().default("100").transform(val => parseInt(val)), // Max 100 chunks per file
  UPLOAD_TIMEOUT: z.string().default("300000").transform(val => parseInt(val)), // 5 minutes default
  UPLOAD_RETRY_ATTEMPTS: z.string().default("3").transform(val => parseInt(val)),
  UPLOAD_RETRY_DELAY: z.string().default("2000").transform(val => parseInt(val)), // 2 seconds base delay
  
  // Progressive upload configuration
  PROGRESSIVE_UPLOAD_THRESHOLD: z.string().default("25").transform(val => parseInt(val) * 1024 * 1024), // 25MB threshold
  PROGRESSIVE_UPLOAD_SESSION_TIMEOUT: z.string().default("1800000").transform(val => parseInt(val)), // 30 minutes
  
  // Memory and performance settings
  IMAGE_PROCESSING_MEMORY_LIMIT: z.string().default("2048").transform(val => parseInt(val)), // 2GB
  IMAGE_PROCESSING_MAX_CONCURRENT: z.string().default("2").transform(val => parseInt(val)),
  IMAGE_PROCESSING_TIMEOUT: z.string().default("300000").transform(val => parseInt(val)),
  
  // Monitoring and logging
  ENABLE_UPLOAD_MONITORING: z.string().default("true").transform(val => val === "true"),
  ENABLE_DETAILED_LOGGING: z.string().default("false").transform(val => val === "true"),
  MEMORY_CHECK_INTERVAL: z.string().default("30000").transform(val => parseInt(val)),
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
    
    // Validate upload configuration
    if (env.UPLOAD_MAX_FILE_SIZE > 2048 * 1024 * 1024) { // 2GB
      console.warn("⚠️  Large max file size detected. Ensure server has sufficient memory and storage.");
    }
    
    if (env.UPLOAD_CHUNK_SIZE < 1024 * 1024) { // 1MB
      console.warn("⚠️  Very small chunk size may impact upload performance.");
    }
  }
  
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Base URL: ${env.BASE_URL}`);
  console.log(`🔐 JWT Secret: ${env.JWT_SECRET.substring(0, 8)}...`);
  console.log(`📁 Upload Config: max ${(env.UPLOAD_MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB, chunks ${(env.UPLOAD_CHUNK_SIZE / 1024 / 1024).toFixed(0)}MB`);
  console.log(`⚡ Processing: ${env.IMAGE_PROCESSING_MAX_CONCURRENT} concurrent, ${env.IMAGE_PROCESSING_MEMORY_LIMIT}MB limit`);
  
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
