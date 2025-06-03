import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { DebouncedSearchInput } from "~/components/ui/DebouncedSearchInput";
import { toast } from "react-hot-toast";
import {
  Mail,
  ArrowLeft,
  Download,
  Calendar,
  Users,
  TrendingUp,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/newsletter/")({
  component: AdminNewsletterPage,
});

function AdminNewsletterPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  
  const trpc = useTRPC();
  
  // Create query options first
  const subscribersQueryOptions = trpc.adminGetNewsletterSubscribers.queryOptions({
    adminToken: adminToken || "",
    search: searchQuery || undefined,
    limit: 100,
  });
  
  const subscribersQuery = useQuery(subscribersQueryOptions);

  const exportSubscribers = () => {
    if (!subscribersQuery.data?.subscribers) return;
    
    const csvContent = [
      "Email,Subscribed Date",
      ...subscribersQuery.data.subscribers.map(sub => 
        `${sub.email},${new Date(sub.createdAt).toLocaleDateString()}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Subscriber list exported successfully");
  };

  const getSubscriberStats = () => {
    if (!subscribersQuery.data?.subscribers) return null;
    
    const subscribers = subscribersQuery.data.subscribers;
    const total = subscribers.length;
    
    // Calculate growth over time
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSubscribers = subscribers.filter(sub => 
      new Date(sub.createdAt) > thirtyDaysAgo
    ).length;
    
    return {
      total,
      recentSubscribers,
      growthRate: total > 0 ? Math.round((recentSubscribers / total) * 100) : 0,
    };
  };

  const stats = getSubscriberStats();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <button
            onClick={exportSubscribers}
            className="flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            disabled={!subscribersQuery.data?.subscribers?.length}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <Mail className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Newsletter Subscribers
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Manage newsletter subscriptions and subscriber data
              </p>
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-muted dark:text-text-light/70">
                      Total Subscribers
                    </h3>
                    <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                      {stats.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-muted dark:text-text-light/70">
                      New This Month
                    </h3>
                    <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                      {stats.recentSubscribers}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-muted dark:text-text-light/70">
                      Growth Rate
                    </h3>
                    <p className="text-2xl font-bold text-text-dark dark:text-text-light">
                      {stats.growthRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                Search Subscribers
              </label>
              <DebouncedSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by email address..."
                className="w-full"
              />
            </div>
          </div>

          {/* Subscribers List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {subscribersQuery.isLoading ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
                <p className="text-text-muted dark:text-text-light/70">Loading subscribers...</p>
              </div>
            ) : subscribersQuery.data?.subscribers.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-text-muted dark:text-text-light/70">
                  {searchQuery ? "No subscribers found matching your search" : "No newsletter subscribers yet"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Subscribed Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Days Subscribed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {subscribersQuery.data?.subscribers.map((subscriber) => {
                      const subscribedDate = new Date(subscriber.createdAt);
                      const daysSubscribed = Math.floor(
                        (Date.now() - subscribedDate.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      
                      return (
                        <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                                <Mail className="h-4 w-4 text-secondary" />
                              </div>
                              <div className="text-sm font-medium text-text-dark dark:text-text-light">
                                {subscriber.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-muted dark:text-text-light/70">
                            {subscribedDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-text-muted dark:text-text-light/70">
                            {daysSubscribed === 0 ? 'Today' : `${daysSubscribed} days`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Newsletter Management Tips
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Export subscriber data regularly for backup purposes</li>
                  <li>• Monitor growth trends to optimize your content strategy</li>
                  <li>• Use the search function to find specific subscribers quickly</li>
                  <li>• Recent subscribers (last 30 days) indicate content engagement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
