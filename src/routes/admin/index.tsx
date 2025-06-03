import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { AdminLogin } from "~/components/admin/AdminLogin";
import { AdminDashboard } from "~/components/admin/AdminDashboard";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

function AdminPage() {
  const { isAdminLoggedIn, adminToken, clearAdminAuth } = useUserStore();
  const [isVerifying, setIsVerifying] = useState(true);
  const trpc = useTRPC();
  
  const verifyToken = useQuery(
    trpc.verifyAdminToken.queryOptions(
      { token: adminToken || "" },
      { 
        enabled: !!adminToken && isAdminLoggedIn,
        retry: false,
      }
    )
  );

  useEffect(() => {
    if (adminToken && isAdminLoggedIn) {
      // Token verification will happen automatically via the query
      if (verifyToken.data && !verifyToken.data.valid) {
        clearAdminAuth();
      }
      setIsVerifying(false);
    } else {
      setIsVerifying(false);
    }
  }, [adminToken, isAdminLoggedIn, verifyToken.data, clearAdminAuth]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-dark dark:text-text-light">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn || !adminToken || (verifyToken.data && !verifyToken.data.valid)) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}
