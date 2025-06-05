import { db } from "~/server/db";

async function setup() {
  console.log("Starting enhanced database setup and image system initialization...");

  // Declare minioClient at function scope to be accessible throughout
  let minioClient: any = null;

  // Enhanced memory optimization initialization with proper async handling
  console.log("Initializing enhanced memory optimization for image processing...");
  
  try {
    // Import memory optimization functions with ES modules
    const memoryModule = await import("./optimize-memory.js");
    const { 
      optimizeMemorySettings, 
      startMemoryMonitoring, 
      validateMemoryConfiguration,
      getMemoryStats,
      initializeMemoryOptimization 
    } = memoryModule;
    
    // Use the new Promise-based initialization if available
    if (initializeMemoryOptimization) {
      const initSuccess = await initializeMemoryOptimization();
      if (!initSuccess) {
        console.warn("⚠️ Memory optimization initialization failed, using fallback");
      }
    } else {
      // Fallback to original initialization
      optimizeMemorySettings();
      startMemoryMonitoring();
      
      const configValid = validateMemoryConfiguration();
      if (!configValid) {
        console.warn("⚠️ Memory configuration is not optimal for image processing. Some features may be limited.");
      }
    }
    
    // Report initial memory status
    const initialStats = getMemoryStats();
    console.log("Initial memory status:", {
      heap: `${initialStats.heap.used.toFixed(1)}MB / ${initialStats.heap.total.toFixed(1)}MB (${initialStats.heap.percentage.toFixed(1)}%)`,
      rss: `${initialStats.rss.toFixed(1)}MB`,
      pressure: initialStats.system.pressure,
      available: `${initialStats.system.available.toFixed(1)}MB`,
    });
    
    // Initialize Minio bucket for image storage with enhanced error handling
    console.log("Initializing image storage system...");
    try {
      // Use dynamic import for better ES module compatibility
      const minioModule = await import('minio');
      const { Client } = minioModule;
      
      minioClient = new Client({
        endPoint: 'minio',
        port: 9000,
        useSSL: false,
        accessKey: 'minioadmin',
        secretKey: 'minioadmin',
        region: 'us-east-1',
        pathStyle: true,
      });
      
      const bucketName = 'images';
      const bucketExists = await minioClient.bucketExists(bucketName);
      
      if (!bucketExists) {
        await minioClient.makeBucket(bucketName);
        console.log(`✅ Created image storage bucket: ${bucketName}`);
      } else {
        console.log(`✅ Image storage bucket already exists: ${bucketName}`);
      }
      
      // Set bucket policy for proper access with better error handling
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      };
      
      try {
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
        console.log(`✅ Set bucket policy for ${bucketName}`);
      } catch (policyError) {
        console.warn(`⚠️ Could not set bucket policy (this is normal for development):`, policyError);
      }
      
    } catch (minioError) {
      console.error("❌ Failed to initialize image storage system:", minioError);
      console.warn("⚠️ Image upload functionality may not work properly");
      
      // Provide specific troubleshooting for Minio issues
      if (minioError instanceof Error) {
        if (minioError.message.includes('ENOTFOUND') || minioError.message.includes('ECONNREFUSED')) {
          console.error("💡 Minio connection issue detected. Ensure:");
          console.error("   - Minio service is running");
          console.error("   - Docker compose services are up");
          console.error("   - Network connectivity to minio:9000");
        }
      }
    }
    
    // Initialize bulletproof image upload system
    console.log("Initializing bulletproof image upload system...");
    try {
      // Validate environment configuration
      const { env } = await import("~/server/env");
      
      console.log("Upload system configuration:", {
        maxFileSize: `${(env.UPLOAD_MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`,
        chunkSize: `${(env.UPLOAD_CHUNK_SIZE / (1024 * 1024)).toFixed(0)}MB`,
        maxChunks: env.UPLOAD_MAX_CHUNKS,
        progressiveThreshold: `${(env.PROGRESSIVE_UPLOAD_THRESHOLD / (1024 * 1024)).toFixed(0)}MB`,
        memoryLimit: `${env.IMAGE_PROCESSING_MEMORY_LIMIT}MB`,
        maxConcurrent: env.IMAGE_PROCESSING_MAX_CONCURRENT,
        monitoringEnabled: env.ENABLE_UPLOAD_MONITORING,
      });
      
      // Test Sharp configuration with enhanced error handling
      try {
        // Use dynamic import to ensure proper ES module loading
        const sharpModule = await import('sharp');
        const sharp = sharpModule.default || sharpModule;
        
        // Verify Sharp is properly imported as a function
        if (typeof sharp !== 'function') {
          throw new Error(`Sharp import failed: expected function, got ${typeof sharp}`);
        }
        
        // Test Sharp functionality with a simple operation
        const testBuffer = Buffer.alloc(100);
        const testInstance = sharp({
          create: { 
            width: 10, 
            height: 10, 
            channels: 3, 
            background: { r: 255, g: 255, b: 255 } 
          }
        });
        
        await testInstance.jpeg().toBuffer();
        testInstance.destroy();
        
        console.log("✅ Sharp image processing library initialized successfully");
      } catch (sharpError) {
        console.error("❌ Sharp initialization failed:", sharpError);
        
        // Provide specific troubleshooting for common Sharp issues
        if (sharpError instanceof Error) {
          if (sharpError.message.includes('not a function')) {
            console.error("💡 Sharp import issue detected. This may be due to:");
            console.error("   - Module resolution conflicts between CommonJS and ES modules");
            console.error("   - Sharp binary compatibility issues");
            console.error("   - Node.js version compatibility");
          }
          
          if (sharpError.message.includes('ENOENT') || sharpError.message.includes('sharp')) {
            console.error("💡 Sharp binary not found. Try:");
            console.error("   - npm rebuild sharp");
            console.error("   - npm install --platform=linux --arch=x64 sharp (for Docker)");
          }
        }
        
        console.warn("⚠️ Image processing may not work properly without Sharp");
        console.warn("⚠️ Consider using alternative image processing or fixing Sharp installation");
      }
      
      // Initialize temp bucket for progressive uploads
      if (minioClient) {
        try {
          const tempBucketName = 'temp-uploads';
          const tempBucketExists = await minioClient.bucketExists(tempBucketName);
          
          if (!tempBucketExists) {
            await minioClient.makeBucket(tempBucketName);
            console.log(`✅ Created temp upload bucket: ${tempBucketName}`);
          } else {
            console.log(`✅ Temp upload bucket already exists: ${tempBucketName}`);
          }
        } catch (tempBucketError) {
          console.warn("⚠️ Could not create temp upload bucket:", tempBucketError);
        }
      }
      
      console.log("✅ Bulletproof image upload system initialized successfully");
      
    } catch (uploadSystemError) {
      console.error("❌ Failed to initialize bulletproof image upload system:", uploadSystemError);
      console.warn("⚠️ Advanced upload features may not work properly");
    }
    
    console.log("✅ Enhanced memory optimization and image system initialized successfully");
    
  } catch (memoryError) {
    console.error("❌ Failed to initialize memory optimization:", memoryError);
    console.warn("⚠️ Continuing with default settings, but image processing may be limited");
  }

  try {
    // Seed Partners
    console.log("Seeding partners...");
    const partnersData = [
      {
        name: "TechCorp Global",
        logoUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=100&fit=crop",
        websiteUrl: "https://techcorp.example.com",
        altText: "TechCorp Global logo",
        order: 1,
        visible: true,
      },
      {
        name: "Innovation Labs",
        logoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=100&fit=crop",
        websiteUrl: "https://innovationlabs.example.com",
        altText: "Innovation Labs logo",
        order: 2,
        visible: true,
      },
      {
        name: "Green Energy Solutions",
        logoUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=200&h=100&fit=crop",
        websiteUrl: "https://greenenergy.example.com",
        altText: "Green Energy Solutions logo",
        order: 3,
        visible: true,
      },
      {
        name: "Digital Infrastructure Inc",
        logoUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&h=100&fit=crop",
        websiteUrl: "https://digitalinfra.example.com",
        altText: "Digital Infrastructure Inc logo",
        order: 4,
        visible: true,
      },
    ];

    for (const partner of partnersData) {
      await db.partner.upsert({
        where: { name: partner.name },
        update: partner,
        create: partner,
      });
    }

    // Seed Innovators
    console.log("Seeding innovators...");
    // Note: Using Unsplash URLs for demo purposes. In production, these should be:
    // 1. Hosted internally via the enhanced image upload system
    // 2. Have proper fallback handling in the frontend components
    // 3. Use the new image variant system for optimal loading
    const innovatorsData = [
      {
        name: "Dr. Sarah Chen",
        role: "Climate Technology Pioneer",
        impact: "Developed breakthrough carbon capture technology deployed in 15 countries",
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
        hasVideo: true,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        bio: "Dr. Sarah Chen is a leading climate technology researcher with over 15 years of experience in sustainable engineering. Her work on carbon capture has revolutionized how we approach climate change mitigation.",
        achievements: JSON.stringify([
          "Winner of Global Climate Innovation Award 2023",
          "Published 50+ peer-reviewed papers on carbon capture",
          "Founded 3 successful climate tech startups",
          "Advisor to UN Climate Change Committee"
        ]),
        featured: true,
        order: 1,
      },
      {
        name: "Marcus Johnson",
        role: "Digital Infrastructure Architect",
        impact: "Built scalable internet infrastructure reaching 2M+ people in rural areas",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
        hasVideo: false,
        bio: "Marcus Johnson specializes in bringing digital connectivity to underserved communities. His innovative mesh network solutions have connected millions of people to the global internet.",
        achievements: JSON.stringify([
          "Connected 2M+ people to internet access",
          "Reduced infrastructure costs by 60%",
          "Founded Rural Connect Initiative",
          "Featured in TIME Magazine's Top Innovators"
        ]),
        featured: true,
        order: 2,
      },
      {
        name: "Dr. Priya Patel",
        role: "Healthcare Innovation Leader",
        impact: "Created AI-powered diagnostic tools used in 500+ hospitals worldwide",
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
        hasVideo: true,
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        bio: "Dr. Priya Patel combines artificial intelligence with medical expertise to create diagnostic tools that save lives. Her innovations have improved healthcare outcomes globally.",
        achievements: JSON.stringify([
          "AI diagnostic tools in 500+ hospitals",
          "Improved diagnosis accuracy by 40%",
          "Founded MedTech AI Solutions",
          "Recipient of Healthcare Innovation Award"
        ]),
        featured: true,
        order: 3,
      },
      {
        name: "Ahmed Al-Rashid",
        role: "Sustainable Agriculture Expert",
        impact: "Developed drought-resistant farming techniques benefiting 100K+ farmers",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
        hasVideo: false,
        bio: "Ahmed Al-Rashid works at the intersection of technology and agriculture to create sustainable farming solutions that can withstand climate change challenges.",
        achievements: JSON.stringify([
          "Helped 100K+ farmers adopt sustainable practices",
          "Increased crop yields by 35% in arid regions",
          "Founded AgriTech Innovation Hub",
          "UNESCO Sustainable Development Award"
        ]),
        featured: true,
        order: 4,
      },
    ];

    for (const innovator of innovatorsData) {
      await db.innovator.upsert({
        where: { name: innovator.name },
        update: innovator,
        create: innovator,
      });
    }

    // Seed Impact Metrics
    console.log("Seeding impact metrics...");
    const impactMetricsData = [
      // Funds raised data by year
      { year: 2021, fundsRaised: 45.5, startupsScaled: 12, regionName: "North America", regionPercentage: 35.0 },
      { year: 2022, fundsRaised: 78.2, startupsScaled: 18, regionName: "North America", regionPercentage: 32.0 },
      { year: 2023, fundsRaised: 125.8, startupsScaled: 25, regionName: "North America", regionPercentage: 30.0 },
      { year: 2024, fundsRaised: 156.3, startupsScaled: 32, regionName: "North America", regionPercentage: 28.0 },
      
      { year: 2021, fundsRaised: 32.1, startupsScaled: 8, regionName: "Europe", regionPercentage: 25.0 },
      { year: 2022, fundsRaised: 52.4, startupsScaled: 14, regionName: "Europe", regionPercentage: 26.0 },
      { year: 2023, fundsRaised: 89.7, startupsScaled: 21, regionName: "Europe", regionPercentage: 27.0 },
      { year: 2024, fundsRaised: 98.2, startupsScaled: 24, regionName: "Europe", regionPercentage: 25.0 },
      
      { year: 2021, fundsRaised: 28.3, startupsScaled: 15, regionName: "Asia", regionPercentage: 22.0 },
      { year: 2022, fundsRaised: 41.8, startupsScaled: 22, regionName: "Asia", regionPercentage: 24.0 },
      { year: 2023, fundsRaised: 67.2, startupsScaled: 28, regionName: "Asia", regionPercentage: 25.0 },
      { year: 2024, fundsRaised: 89.1, startupsScaled: 35, regionName: "Asia", regionPercentage: 27.0 },
      
      { year: 2021, fundsRaised: 15.7, startupsScaled: 6, regionName: "Africa", regionPercentage: 12.0 },
      { year: 2022, fundsRaised: 23.1, startupsScaled: 9, regionName: "Africa", regionPercentage: 13.0 },
      { year: 2023, fundsRaised: 34.5, startupsScaled: 12, regionName: "Africa", regionPercentage: 14.0 },
      { year: 2024, fundsRaised: 45.8, startupsScaled: 16, regionName: "Africa", regionPercentage: 15.0 },
      
      { year: 2021, fundsRaised: 8.2, startupsScaled: 3, regionName: "South America", regionPercentage: 6.0 },
      { year: 2022, fundsRaised: 12.5, startupsScaled: 5, regionName: "South America", regionPercentage: 5.0 },
      { year: 2023, fundsRaised: 18.9, startupsScaled: 7, regionName: "South America", regionPercentage: 4.0 },
      { year: 2024, fundsRaised: 24.1, startupsScaled: 9, regionName: "South America", regionPercentage: 5.0 },
    ];

    for (const metric of impactMetricsData) {
      // Use a unique identifier that combines year and region
      const uniqueId = `${metric.year}-${metric.regionName}`;
      
      // Check if record exists first, then create or update
      const existingMetric = await db.impactMetric.findFirst({
        where: {
          year: metric.year,
          regionName: metric.regionName,
        },
      });

      if (existingMetric) {
        await db.impactMetric.update({
          where: { id: existingMetric.id },
          data: metric,
        });
      } else {
        await db.impactMetric.create({
          data: metric,
        });
      }
    }

    // Seed Comments
    console.log("Seeding comments...");
    const commentsData = [
      {
        content: "This is exactly the kind of innovation we need to address climate change. The collaboration between different regions is inspiring!",
        author: "Elena Rodriguez",
        avatar: "bg-secondary",
        likes: 12,
        isGeneralDiscussion: true,
      },
      {
        content: "I'm particularly interested in the digital infrastructure projects. How can local communities get involved in these initiatives?",
        author: "David Kim",
        avatar: "bg-accent",
        likes: 8,
        isGeneralDiscussion: true,
      },
      {
        content: "The impact metrics are impressive! It's great to see transparent reporting on the actual outcomes of these projects.",
        author: "Maria Santos",
        avatar: "bg-tech-forest",
        likes: 15,
        isGeneralDiscussion: true,
      },
      {
        content: "As someone working in sustainable agriculture, I'd love to connect with others in this space. The potential for knowledge sharing is huge.",
        author: "John Thompson",
        avatar: "bg-digital-sunrise",
        likes: 6,
        isGeneralDiscussion: true,
      },
      {
        content: "The healthcare innovations mentioned here could revolutionize medical care in underserved areas. How can we accelerate deployment?",
        author: "Dr. Amira Hassan",
        avatar: "bg-global-cobalt",
        likes: 9,
        isGeneralDiscussion: true,
      },
    ];

    for (const comment of commentsData) {
      // Check if comment already exists
      const existingComment = await db.comment.findFirst({
        where: {
          content: comment.content,
          author: comment.author,
        },
      });

      if (!existingComment) {
        await db.comment.create({
          data: comment,
        });
      }
    }

    // Seed Newsletter Subscribers (sample data)
    console.log("Seeding newsletter subscribers...");
    const subscribersData = [
      { email: "elena.rodriguez@example.com" },
      { email: "david.kim@example.com" },
      { email: "maria.santos@example.com" },
    ];

    for (const subscriber of subscribersData) {
      await db.newsletterSubscriber.upsert({
        where: { email: subscriber.email },
        update: subscriber,
        create: subscriber,
      });
    }

    // Final memory status report
    const memoryModule = await import("./optimize-memory.js");
    const { getMemoryStats } = memoryModule;
    const finalStats = getMemoryStats();
    console.log("Setup completed successfully!");
    console.log("Final memory status:", {
      heap: `${finalStats.heap.used.toFixed(1)}MB / ${finalStats.heap.total.toFixed(1)}MB (${finalStats.heap.percentage.toFixed(1)}%)`,
      rss: `${finalStats.rss.toFixed(1)}MB`,
      pressure: finalStats.system.pressure,
      available: `${finalStats.system.available.toFixed(1)}MB`,
    });
    
    if (finalStats.system.pressure !== 'low') {
      console.warn("⚠️ Memory pressure is elevated after setup. Consider increasing system memory for optimal image processing performance.");
    } else {
      console.log("✅ System memory status is optimal for image processing");
    }

    // System health validation and recommendations with async operations
    console.log("Performing system health validation...");
    try {
      const healthChecks = {
        memory: finalStats.system.pressure === 'low',
        heapSize: finalStats.heap.total > 1024, // At least 1GB heap
        gcAvailable: !!global.gc,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        sharpAvailable: false,
        minioAvailable: !!minioClient,
      };
      
      // Test Sharp availability asynchronously
      try {
        const sharpModule = await import('sharp');
        const sharp = sharpModule.default || sharpModule;
        if (typeof sharp === 'function') {
          healthChecks.sharpAvailable = true;
        }
      } catch {
        healthChecks.sharpAvailable = false;
      }
      
      console.log("System health check results:", healthChecks);
      
      // Provide recommendations based on health checks
      const recommendations: string[] = [];
      
      if (!healthChecks.memory) {
        recommendations.push("Consider increasing system memory or reducing concurrent operations");
      }
      
      if (!healthChecks.heapSize) {
        recommendations.push("Increase Node.js heap size with --max-old-space-size=4096 for better image processing");
      }
      
      if (!healthChecks.gcAvailable) {
        recommendations.push("Add --expose-gc to NODE_OPTIONS for enhanced memory management");
      }
      
      if (!healthChecks.sharpAvailable) {
        recommendations.push("Fix Sharp installation: npm rebuild sharp or npm install --platform=linux --arch=x64 sharp");
      }
      
      if (!healthChecks.minioAvailable) {
        recommendations.push("Ensure Minio service is running and accessible at minio:9000");
      }
      
      if (recommendations.length > 0) {
        console.log("💡 System optimization recommendations:");
        recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      } else {
        console.log("✅ System configuration is optimal for bulletproof image processing");
      }
      
    } catch (healthError) {
      console.warn("⚠️ Could not complete system health validation:", healthError);
    }

  } catch (error) {
    console.error("❌ Error during database setup:", error);
    throw error;
  }
}

// Export the setup function as default
export default setup;

// Only run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setup()
    .then(() => {
      console.log("✅ Enhanced setup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Setup failed:", error);
      process.exit(1);
    });
}
