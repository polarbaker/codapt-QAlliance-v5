import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useUserStore } from "~/stores/userStore";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Trash2, X } from "lucide-react";

interface PartnerBulkActionsProps {
  selectedPartners: number[];
  onClearSelection: () => void;
  onRefresh: () => void;
  partnerNames: string[];
}

export function PartnerBulkActions({
  selectedPartners,
  onClearSelection,
  onRefresh,
  partnerNames,
}: PartnerBulkActionsProps) {
  const { adminToken } = useUserStore();
  const trpc = useTRPC();

  const bulkDeleteMutation = useMutation(
    trpc.adminBulkDeletePartners.mutationOptions({
      onSuccess: () => {
        onRefresh();
        onClearSelection();
        toast.success("Selected partners deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const bulkUpdateMutation = useMutation(
    trpc.adminBulkUpdatePartners.mutationOptions({
      onSuccess: (_, variables) => {
        onRefresh();
        onClearSelection();
        const action = variables.data.visible ? "shown" : "hidden";
        toast.success(`Selected partners ${action} successfully`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleBulkDelete = () => {
    if (selectedPartners.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedPartners.length} partner(s)?\n\n${partnerNames.join(", ")}`;
    
    if (confirm(confirmMessage)) {
      bulkDeleteMutation.mutate({
        adminToken: adminToken || "",
        partnerIds: selectedPartners,
      });
    }
  };

  const handleBulkVisibility = (visible: boolean) => {
    if (selectedPartners.length === 0) return;

    bulkUpdateMutation.mutate({
      adminToken: adminToken || "",
      partnerIds: selectedPartners,
      data: { visible },
    });
  };

  if (selectedPartners.length === 0) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedPartners.length} partner(s) selected
          </span>
          <button
            onClick={onClearSelection}
            className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            <X className="h-3 w-3" />
            <span>Clear selection</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleBulkVisibility(true)}
            disabled={bulkUpdateMutation.isPending}
            className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded text-sm hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="h-3 w-3" />
            <span>Show Selected</span>
          </button>
          
          <button
            onClick={() => handleBulkVisibility(false)}
            disabled={bulkUpdateMutation.isPending}
            className="flex items-center space-x-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded text-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EyeOff className="h-3 w-3" />
            <span>Hide Selected</span>
          </button>
          
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
            className="flex items-center space-x-1 px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete Selected</span>
          </button>
        </div>
      </div>
    </div>
  );
}
