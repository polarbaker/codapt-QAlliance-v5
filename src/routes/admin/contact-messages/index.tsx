import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DebouncedSearchInput } from "~/components/ui/DebouncedSearchInput";
import { Badge } from "~/components/ui/Badge";
import { toast } from "react-hot-toast";
import {
  Mail,
  ArrowLeft,
  Eye,
  CheckCircle,
  MessageCircle,
  Calendar,
  User,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/contact-messages/")({
  component: AdminContactMessagesPage,
});

function AdminContactMessagesPage() {
  const { adminToken } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read" | "replied">("all");
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  
  const trpc = useTRPC();
  
  // Create query options first
  const messagesQueryOptions = trpc.adminGetContactMessages.queryOptions({
    adminToken: adminToken || "",
    search: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });
  
  const messagesQuery = useQuery(messagesQueryOptions);
  
  // Create mutation options
  const updateStatusMutationOptions = trpc.adminUpdateContactMessageStatus.mutationOptions({
    onSuccess: () => {
      messagesQuery.refetch();
      toast.success("Message status updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateStatusMutation = useMutation(updateStatusMutationOptions);

  const handleStatusUpdate = (id: number, status: "unread" | "read" | "replied") => {
    updateStatusMutation.mutate({
      adminToken: adminToken || "",
      id,
      status,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return <Badge variant="warning">Unread</Badge>;
      case "read":
        return <Badge variant="info">Read</Badge>;
      case "replied":
        return <Badge variant="success">Replied</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

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
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/20">
              <Mail className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Contact Messages
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                View and respond to contact form submissions
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Search
                </label>
                <DebouncedSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by name, email, or subject..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value="all">All Messages</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Messages List */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {messagesQuery.isLoading ? (
                  <div className="p-8 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
                    <p className="text-text-muted dark:text-text-light/70">Loading messages...</p>
                  </div>
                ) : messagesQuery.data?.messages.length === 0 ? (
                  <div className="p-8 text-center">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-text-muted dark:text-text-light/70">No contact messages found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {messagesQuery.data?.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                          selectedMessage?.id === message.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-text-dark dark:text-text-light">
                                  {message.name}
                                </p>
                                {getStatusBadge(message.status)}
                              </div>
                              <p className="text-sm text-text-muted dark:text-text-light/70">
                                {message.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-text-muted dark:text-text-light/70">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <h4 className="text-sm font-medium text-text-dark dark:text-text-light mb-2">
                          {message.subject}
                        </h4>
                        
                        <p className="text-sm text-text-muted dark:text-text-light/70 line-clamp-2">
                          {truncateText(message.message, 120)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Message Detail */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 sticky top-8">
                {selectedMessage ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-text-dark dark:text-text-light">
                        Message Details
                      </h3>
                      {getStatusBadge(selectedMessage.status)}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-1">
                          From
                        </label>
                        <p className="text-sm text-text-dark dark:text-text-light">
                          {selectedMessage.name}
                        </p>
                        <p className="text-sm text-text-muted dark:text-text-light/70">
                          {selectedMessage.email}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-1">
                          Subject
                        </label>
                        <p className="text-sm text-text-dark dark:text-text-light">
                          {selectedMessage.subject}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-1">
                          Received
                        </label>
                        <p className="text-sm text-text-dark dark:text-text-light">
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text-muted dark:text-text-light/70 mb-1">
                          Message
                        </label>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                          <p className="text-sm text-text-dark dark:text-text-light whitespace-pre-wrap">
                            {selectedMessage.message}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {selectedMessage.status === "unread" && (
                          <button
                            onClick={() => handleStatusUpdate(selectedMessage.id, "read")}
                            className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Mark as Read</span>
                          </button>
                        )}
                        
                        {selectedMessage.status !== "replied" && (
                          <button
                            onClick={() => handleStatusUpdate(selectedMessage.id, "replied")}
                            className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Mark as Replied</span>
                          </button>
                        )}
                        
                        <a
                          href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                          className="flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-text-dark dark:text-text-light rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          <span>Reply via Email</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-text-muted dark:text-text-light/70">
                      Select a message to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
