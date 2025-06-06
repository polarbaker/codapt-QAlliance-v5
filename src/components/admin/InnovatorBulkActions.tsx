import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "~/stores/userStore";
import { toast } from "react-hot-toast";
import {
  X,
  Trash2,
  Star,
  StarOff,
  ArrowUpDown,
} from "lucide-react";

interface InnovatorBulkActionsProps {
  selectedIds: number[];
  onClear: () => void;
  onSuccess?: () => void;
}

export function InnovatorBulkActions({ 
  selectedIds, 
  onClear, 
  onSuccess 
}: InnovatorBulkActionsProps) {
  const { adminToken } = useUserStore();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Individual delete mutation
  const deleteMutation = trpc.adminDeleteInnovator.useMutation({});

  // Individual update mutation
  const updateMutation = trpc.adminUpdateInnovator.useMutation({});

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedIds.length} selected innovator${selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.`;
    if (confirm(confirmMessage)) {
      // Execute deletions sequentially to avoid overwhelming the server
      try {
        for (const id of selectedIds) {
          await deleteMutation.mutateAsync({
            adminToken: adminToken || "",
            id,
          });
        }
        
        // Invalidate all relevant queries to ensure immediate updates
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['adminGetInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getInnovators'] }),
          queryClient.invalidateQueries({ queryKey: ['getFeaturedInnovators'] }),
        ]);
        
        toast.success(`${selectedIds.length} innovator${selectedIds.length > 1 ? 's' : ''} deleted`);
        onClear();
        onSuccess?.();
      } catch (error) {
        toast.error("Error deleting some innovators");
      }
    }
  };

  const handleBatchFeature = async (featured: boolean) => {
    if (selectedIds.length === 0) return;
    
    try {
      // Execute updates sequentially to avoid overwhelming the server
      for (const id of selectedIds) {
        await updateMutation.mutateAsync({
          adminToken: adminToken || "",
          id,
          data: { featured },
        });
      }
      
      // Invalidate all relevant queries to ensure immediate updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['adminGetInnovators'] }),
        queryClient.invalidateQueries({ queryKey: ['getInnovators'] }),
        queryClient.invalidateQueries({ queryKey: ['getFeaturedInnovators'] }),
      ]);
      
      toast.success(`${selectedIds.length} innovator${selectedIds.length > 1 ? 's' : ''} ${featured ? 'featured' : 'unfeatured'}`);
      onClear();
      onSuccess?.();
    } catch (error) {
      toast.error("Error updating featured status");
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedIds.length} innovator{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
            >
              {isExpanded ? 'Hide Actions' : 'Show Actions'}
            </button>
          </div>
          <button
            onClick={onClear}
            className="text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBatchFeature(true)}
                disabled={updateMutation.isPending}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50"
              >
                <Star className="h-4 w-4" />
                <span>Feature All</span>
              </button>
              
              <button
                onClick={() => handleBatchFeature(false)}
                disabled={updateMutation.isPending}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <StarOff className="h-4 w-4" />
                <span>Unfeature All</span>
              </button>
              
              <button
                onClick={handleBatchDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete All'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
