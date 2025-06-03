import { db } from "~/server/db";

async function setup() {
  console.log("Starting database setup and seeding...");

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
    // 1. Hosted internally via Minio object storage
    // 2. Have proper fallback handling in the frontend components
    // 3. Use more reliable image sources with proper licensing
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

    console.log("Database seeding completed successfully!");

  } catch (error) {
    console.error("Error during database setup:", error);
    throw error;
  }
}

// Export the setup function as default
export default setup;

// Only run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setup()
    .then(() => {
      console.log("Setup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Setup failed:", error);
      process.exit(1);
    });
}
