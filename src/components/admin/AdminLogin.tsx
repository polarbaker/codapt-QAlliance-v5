import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useUserStore } from "~/stores/userStore";
import { adminLoginSchema, type AdminLoginFormData } from "~/constants/validation";
import { toast } from "react-hot-toast";
import { Lock, Shield } from "lucide-react";

export function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const { setAdminAuth } = useUserStore();
  const trpc = useTRPC();
  const loginMutation = useMutation(trpc.adminLogin.mutationOptions());

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    setIsLoading(true);
    try {
      const result = await loginMutation.mutateAsync(data);
      
      if (result.success && result.token) {
        setAdminAuth(result.token);
        toast.success("Admin login successful!");
        reset();
      }
    } catch (error) {
      toast.error("Invalid admin password. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-secondary/10">
            <Shield className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-text-dark dark:text-text-light">
            Admin Access
          </h2>
          <p className="mt-2 text-sm text-text-muted dark:text-text-light/70">
            Enter the admin password to access the control panel
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="password" className="sr-only">
              Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                className="appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-text-dark dark:text-text-light bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary focus:z-10"
                placeholder="Admin password"
              />
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
