import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "~/stores/userStore";
import { StatCard } from "~/components/ui/StatCard";
import {
  Users,
  Star,
  Video,
  TrendingUp,
  Calendar,
  Award,
} from "lucide-react";

export function InnovatorStats() {
  const { adminToken } = useUserStore();
  const trpc = useTRPC();
  
  // Fetch all innovators to calculate stats
  const innovatorsQuery = useQuery(
    trpc.adminGetInnovators.queryOptions({
      adminToken: adminToken || "",
      limit: 100, // Get a large number to calculate stats
    })
  );

  if (innovatorsQuery.isLoading || !innovatorsQuery.data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const innovators = innovatorsQuery.data.innovators;
  
  const totalInnovators = innovators.length;
  const featuredInnovators = innovators.filter(i => i.featured).length;
  const innovatorsWithVideo = innovators.filter(i => i.hasVideo).length;
  
  // Calculate recent additions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentInnovators = innovators.filter(i => new Date(i.createdAt) > thirtyDaysAgo).length;
  
  // Calculate total achievements
  const totalAchievements = innovators.reduce((total, innovator) => {
    try {
      const achievements = JSON.parse(innovator.achievements || "[]");
      return total + (Array.isArray(achievements) ? achievements.length : 0);
    } catch {
      return total;
    }
  }, 0);

  const stats = [
    {
      title: "Total Innovators",
      value: totalInnovators.toString(),
      icon: <Users className="h-6 w-6" />,
      trend: recentInnovators > 0 ? `+${recentInnovators} this month` : "No new additions",
      trendUp: recentInnovators > 0,
    },
    {
      title: "Featured",
      value: featuredInnovators.toString(),
      icon: <Star className="h-6 w-6" />,
      trend: `${Math.round((featuredInnovators / totalInnovators) * 100)}% of total`,
      trendUp: featuredInnovators > 0,
    },
    {
      title: "With Videos",
      value: innovatorsWithVideo.toString(),
      icon: <Video className="h-6 w-6" />,
      trend: `${Math.round((innovatorsWithVideo / totalInnovators) * 100)}% have videos`,
      trendUp: innovatorsWithVideo > 0,
    },
    {
      title: "Total Achievements",
      value: totalAchievements.toString(),
      icon: <Award className="h-6 w-6" />,
      trend: `${Math.round(totalAchievements / totalInnovators)} avg per innovator`,
      trendUp: totalAchievements > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          trend={stat.trend}
          trendUp={stat.trendUp}
        />
      ))}
    </div>
  );
}
