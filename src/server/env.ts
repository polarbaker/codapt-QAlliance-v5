import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  BASE_URL: z.string().min(1, "BASE_URL is required").refine(
    (url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: "BASE_URL must be a valid URL (e.g., http://localhost:3000 or https://yourdomain.com)"
    }
  ),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long for security").default(() => {
    // Generate a secure default for development
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️  Using default JWT_SECRET for development. Set JWT_SECRET environment variable for production!");
      return "your-super-secret-jwt-key-change-in-production-this-must-be-at-least-32-chars";
    }
    throw new Error("JWT_SECRET is required in production");
  }),
  
  // Enhanced image serving configuration
  IMAGE_BASE_URL: z.string().optional().transform(val => val || process.env.BASE_URL), // Fallback to BASE_URL
  IMAGE_CORS_ORIGINS: z.string().default("*").transform(val => val.split(',')), // Comma-separated origins
  
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
    console.log("🔒 Production environment detected - running security checks...");
    
    if (env.JWT_SECRET.includes("change-in-production") || env.JWT_SECRET.includes("default")) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("🚨 CRITICAL SECURITY WARNING: Using default JWT_SECRET in production!");
      console.error("   This is a serious security vulnerability that must be fixed immediately.");
      console.error("");
      console.error("🔧 To fix this:");
      console.error("   1. Generate a secure secret: openssl rand -base64 32");
      console.error("   2. Set it in your environment: JWT_SECRET=your-generated-secret");
      console.error("   3. Restart the application");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      process.exit(1);
    }
    
    if (env.ADMIN_PASSWORD.length < 8) {
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.warn("⚠️  SECURITY WARNING: Admin password should be at least 8 characters long for production.");
      console.warn("   💡 Consider using a longer, more complex password for better security");
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    
    // Validate BASE_URL for production
    if (!env.BASE_URL.startsWith('https://')) {
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.warn("⚠️  SECURITY WARNING: BASE_URL should use HTTPS in production for secure image serving.");
      console.warn("   💡 Update BASE_URL to use https:// protocol");
      console.warn("   💡 Example: https://yourdomain.com");
      console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    
    // Validate upload configuration
    if (env.UPLOAD_MAX_FILE_SIZE > 2048 * 1024 * 1024) { // 2GB
      console.warn("⚠️  Large max file size detected. Ensure server has sufficient memory and storage.");
      console.warn("   💡 Consider reducing UPLOAD_MAX_FILE_SIZE if experiencing memory issues");
    }
    
    if (env.UPLOAD_CHUNK_SIZE < 1024 * 1024) { // 1MB
      console.warn("⚠️  Very small chunk size may impact upload performance.");
      console.warn("   💡 Consider increasing UPLOAD_CHUNK_SIZE to at least 1MB (1)");
    }
    
    console.log("✅ Production security checks completed");
  }
  
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Base URL: ${env.BASE_URL}`);
  console.log(`🖼️  Image Base URL: ${env.IMAGE_BASE_URL || env.BASE_URL}`);
  console.log(`🌐 CORS Origins: ${env.IMAGE_CORS_ORIGINS.join(', ')}`);
  console.log(`🔐 JWT Secret: ${env.JWT_SECRET.substring(0, 8)}...`);
  console.log(`📁 Upload Config: max ${(env.UPLOAD_MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB, chunks ${(env.UPLOAD_CHUNK_SIZE / 1024 / 1024).toFixed(0)}MB`);
  console.log(`⚡ Processing: ${env.IMAGE_PROCESSING_MAX_CONCURRENT} concurrent, ${env.IMAGE_PROCESSING_MEMORY_LIMIT}MB limit`);
  
} catch (error) {
  console.error("❌ Environment validation failed:");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  if (error instanceof z.ZodError) {
    console.error("📋 Missing or invalid environment variables:");
    console.error("");
    
    error.errors.forEach(err => {
      const path = err.path.join('.');
      console.error(`🔸 ${path}: ${err.message}`);
      
      // Provide specific troubleshooting for common variables
      switch (path) {
        case 'BASE_URL':
          console.error("   💡 Example: http://localhost:8000 or https://yourdomain.com");
          console.error("   💡 Make sure it's a complete URL with protocol");
          break;
        case 'ADMIN_PASSWORD':
          console.error("   💡 Set a secure password for admin access");
          console.error("   💡 Example: ADMIN_PASSWORD=your-secure-password-here");
          break;
        case 'JWT_SECRET':
          console.error("   💡 Must be at least 32 characters long for security");
          console.error("   💡 Generate one: openssl rand -base64 32");
          break;
        case 'DATABASE_URL':
          console.error("   💡 Example: postgresql://user:password@host:port/database");
          break;
      }
      console.error("");
    });
    
    console.error("📖 For complete setup instructions, see .env.example");
    console.error("🔧 Copy .env.example to .env and fill in the required values");
  } else {
    console.error("❌ Unexpected validation error:", error);
  }
  
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error("🚫 Application cannot start with invalid environment configuration");
  process.exit(1);
}

export { env };
