import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "~/components/AdminCard";
import { StatCard } from "~/components/ui/StatCard";
import { ImageSystemDashboard } from "~/components/admin/ImageSystemDashboard";
import { toast } from "react-hot-toast";
import {
  Users,
  FileText,
  MessageSquare,
  Mail,
  Trophy,
  BookOpen,
  Newspaper,
  Handshake,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  Database,
  Eye,
  Image,
} from "lucide-react";

export function AdminDashboard() {
  const { clearAdminAuth } = useUserStore();
  const trpc = useTRPC();
  
  // Fetch summary statistics using the correct pattern
  const summaryStats = useQuery(trpc.getSummaryStats.queryOptions());

  const handleLogout = () => {
    clearAdminAuth();
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-secondary/10">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Admin Dashboard
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Manage your Quantum Alliance platform
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Summary Statistics */}
        <div className="py-8">
          <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
            Platform Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Problem Submissions"
              value={summaryStats.data?.totalProblems || 0}
              icon={<FileText className="h-6 w-6" />}
              trend="up"
              trendValue="12%"
            />
            <StatCard
              title="Active Challenges"
              value={summaryStats.data?.activeChallenges || 0}
              icon={<Trophy className="h-6 w-6" />}
              trend="up"
              trendValue="8%"
            />
            <StatCard
              title="Newsletter Subscribers"
              value={summaryStats.data?.newsletterSubscribers || 0}
              icon={<Mail className="h-6 w-6" />}
              trend="up"
              trendValue="24%"
            />
            <StatCard
              title="Total Comments"
              value={summaryStats.data?.totalComments || 0}
              icon={<MessageSquare className="h-6 w-6" />}
              trend="up"
              trendValue="16%"
            />
          </div>
        </div>

        {/* Management Sections */}
        <div className="py-8">
          <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
            Content Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AdminCard
              title="Problem Submissions"
              description="Review and manage problem submissions from organizations"
              icon={<FileText className="h-8 w-8 text-blue-600" />}
              link="/admin/problems"
            />
            <AdminCard
              title="Challenges"
              description="Create and manage innovation challenges"
              icon={<Trophy className="h-8 w-8 text-yellow-600" />}
              link="/admin/challenges"
            />
            <AdminCard
              title="Case Studies"
              description="Manage success stories and case studies"
              icon={<BookOpen className="h-8 w-8 text-green-600" />}
              link="/admin/case-studies"
            />
            <AdminCard
              title="News Articles"
              description="Create and publish news articles"
              icon={<Newspaper className="h-8 w-8 text-purple-600" />}
              link="/admin/news"
            />
            <AdminCard
              title="Images"
              description="Manage all images used across the site"
              icon={<Image className="h-8 w-8 text-purple-600" />}
              link="/admin/images"
            />
            <AdminCard
              title="Innovators"
              description="Manage the Hall of Innovators profiles"
              icon={<Users className="h-8 w-8 text-indigo-600" />}
              link="/admin/innovators"
            />
            <AdminCard
              title="Partners"
              description="Manage partner organizations and logos"
              icon={<Handshake className="h-8 w-8 text-teal-600" />}
              link="/admin/partners"
            />
          </div>
        </div>

        {/* Communication & Analytics */}
        <div className="py-8">
          <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
            Communication & Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AdminCard
              title="Comments"
              description="Moderate and manage user comments"
              icon={<MessageSquare className="h-8 w-8 text-orange-600" />}
              link="/admin/comments"
            />
            <AdminCard
              title="Newsletter Subscribers"
              description="Manage newsletter subscriptions and send updates"
              icon={<Mail className="h-8 w-8 text-red-600" />}
              link="/admin/newsletter"
            />
            <AdminCard
              title="Contact Messages"
              description="View and respond to contact form submissions"
              icon={<Mail className="h-8 w-8 text-pink-600" />}
              link="/admin/contact-messages"
            />
            <AdminCard
              title="Impact Metrics"
              description="Update platform impact statistics and data"
              icon={<BarChart3 className="h-8 w-8 text-cyan-600" />}
              link="/admin/impact-metrics"
            />
            <AdminCard
              title="Database Backup"
              description="Create and manage database backups"
              icon={<Database className="h-8 w-8 text-gray-600" />}
              link="/admin/backup"
              comingSoon={true}
              disabled={true}
            />
            <AdminCard
              title="Analytics"
              description="View detailed platform analytics and insights"
              icon={<Eye className="h-8 w-8 text-emerald-600" />}
              link="/admin/analytics"
              comingSoon={true}
              disabled={true}
            />
          </div>
        </div>

        {/* Image System Management */}
        <div className="py-8">
          <h2 className="text-xl font-semibold text-text-dark dark:text-text-light mb-6">
            Image System Management
          </h2>
          <ImageSystemDashboard />
        </div>
      </div>
    </div>
  );
}
