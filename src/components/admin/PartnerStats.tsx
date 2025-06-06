import { useTRPC } from "~/trpc/react";
import { useUserStore } from "~/stores/userStore";
import { StatCard } from "~/components/ui/StatCard";
import { Handshake, Eye, EyeOff, TrendingUp } from "lucide-react";

export function PartnerStats() {
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  const partnersQuery = trpc.adminGetPartners.useQuery({
    adminToken: adminToken || "",
    limit: 100, // Get all partners for stats
  });

  const partners = partnersQuery.data?.partners || [];
  const totalPartners = partners.length;
  const visiblePartners = partners.filter(p => p.visible).length;
  const hiddenPartners = partners.filter(p => !p.visible).length;
  
  // Calculate recent additions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentPartners = partners.filter(p => 
    new Date(p.createdAt) > thirtyDaysAgo
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Partners"
        value={totalPartners}
        icon={<Handshake className="h-6 w-6" />}
        color="blue"
        isLoading={partnersQuery.isLoading}
      />
      
      <StatCard
        title="Visible Partners"
        value={visiblePartners}
        icon={<Eye className="h-6 w-6" />}
        color="green"
        isLoading={partnersQuery.isLoading}
      />
      
      <StatCard
        title="Hidden Partners"
        value={hiddenPartners}
        icon={<EyeOff className="h-6 w-6" />}
        color="yellow"
        isLoading={partnersQuery.isLoading}
      />
      
      <StatCard
        title="Added This Month"
        value={recentPartners}
        icon={<TrendingUp className="h-6 w-6" />}
        color="purple"
        isLoading={partnersQuery.isLoading}
      />
    </div>
  );
}
