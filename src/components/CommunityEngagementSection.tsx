import { useState, useEffect } from "react";
import { MessageSquare, Heart, Share2, RefreshCw, User } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useUserStore } from "~/stores/userStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Define the form validation schema with zod
const commentSchema = z.object({
  content: z.string().min(5, "Comment must be at least 5 characters"),
});

type CommentFormData = z.infer<typeof commentSchema>;

// Type for comment data from API
interface CommentData {
  id: number;
  createdAt: Date;
  content: string;
  author: string;
  avatar: string;
  likes: number;
  problemId: number | null;
  isGeneralDiscussion: boolean;
}

interface CommentProps {
  comment: CommentData;
  onLike: (commentId: number) => void;
  isLiked: boolean;
}

function Comment({ comment, onLike, isLiked }: CommentProps) {
  // Format the date
  const formattedDate = new Date(comment.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  return (
    <div className="border-b border-neutral-light/10 dark:border-neutral-dark/10 py-6 first:pt-0">
      <div className="mb-3 flex items-center">
        <div className={`mr-3 h-10 w-10 flex items-center justify-center rounded-full ${comment.avatar}`}>
          <User size={20} className="text-white" />
        </div>
        <div>
          <p className="text-base font-semibold text-text-dark dark:text-text-light">
            {comment.author}
          </p>
          <p className="text-xs text-text-dark/60 dark:text-text-light/60">
            {formattedDate}
          </p>
        </div>
      </div>
      <p className="mb-4 text-base text-text-dark dark:text-text-light">
        {comment.content}
      </p>
      <div className="flex items-center space-x-6">
        <button 
          className={`flex items-center text-sm ${
            isLiked 
              ? "text-secondary" 
              : "text-text-dark/60 dark:text-text-light/60 hover:text-secondary"
          }`}
          onClick={() => onLike(comment.id)}
          disabled={isLiked}
        >
          <Heart size={16} className={`mr-2 ${isLiked ? "fill-secondary" : ""}`} />
          {comment.likes}
        </button>
        <button 
          className="flex items-center text-sm text-text-dark/60 dark:text-text-light/60 hover:text-secondary"
          onClick={() => toast.info("Reply feature coming soon! We're working on enabling direct responses to comments.")}
        >
          <MessageSquare size={16} className="mr-2" />
          Reply
        </button>
        <button 
          className="flex items-center text-sm text-text-dark/60 dark:text-text-light/60 hover:text-secondary"
          onClick={() => toast.info("Share feature coming soon! Soon you'll be able to share these insights on your favorite social platforms.")}
        >
          <Share2 size={16} className="mr-2" />
          Share
        </button>
      </div>
    </div>
  );
}

function UserProfile() {
  const { name, avatar, setName, setAvatar } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);
  
  // Avatar options
  const avatarOptions = [
    { value: "bg-secondary", label: "Orange" },
    { value: "bg-accent", label: "Yellow" },
    { value: "bg-primary-light", label: "Gray" },
    { value: "bg-neutral-medium", label: "Light Gray" },
    { value: "bg-tech-forest", label: "Green" },
    { value: "bg-digital-sunrise", label: "Blue" },
    { value: "bg-global-cobalt", label: "Purple" },
    { value: "bg-neutral-brown", label: "Brown" },
  ];
  
  const handleSave = () => {
    if (tempName.trim().length >= 2) {
      setName(tempName);
      setIsEditing(false);
      toast.success("Profile updated!");
    } else {
      toast.error("Name must be at least 2 characters");
    }
  };
  
  return (
    <div className="mb-6 border-b border-neutral-light/10 dark:border-neutral-dark/10 pb-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-text-dark dark:text-text-light">Your Profile</h4>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm text-secondary hover:text-secondary-light"
        >
          {isEditing ? "Cancel" : "Edit"}
        </button>
      </div>
      
      {isEditing ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light">
              Display Name
            </label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="w-full rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light">
              Avatar Color
            </label>
            <div className="flex space-x-3">
              {avatarOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAvatar(option.value)}
                  className={`h-10 w-10 rounded-full ${option.value} ${
                    avatar === option.value ? "ring-2 ring-white" : ""
                  }`}
                  aria-label={`Select ${option.label} avatar`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleSave}
            className="rounded-full bg-secondary px-6 py-2 text-sm font-medium text-white transition-all hover:bg-secondary-light"
          >
            Save Profile
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center">
          <div className={`mr-4 h-12 w-12 flex items-center justify-center rounded-full ${avatar}`}>
            <User size={24} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-medium text-text-dark dark:text-text-light">
              {name || "Anonymous User"}
            </p>
            <p className="text-sm text-text-dark/60 dark:text-text-light/60">
              {name ? "Community Member" : "Set your name to join the conversation"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommunityEngagementSection() {
  const [refreshKey, setRefreshKey] = useState(0); // For manual refresh
  const { name, avatar, likedComments, likeComment, hasLikedComment } = useUserStore();
  const trpc = useTRPC();
  
  // Form for posting comments
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema)
  });
  
  // Fetch comments using tRPC
  const commentsQuery = useQuery(
    trpc.getComments.queryOptions(
      {
        limit: 5
      },
      {
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 1000 * 60, // 1 minute
        queryKey: [`comments-${refreshKey}`] // Add refreshKey to force refetch
      }
    )
  );
  
  // Post comment mutation
  const postCommentMutation = useMutation(
    trpc.postComment.mutationOptions({
      onSuccess: () => {
        toast.success("Comment posted successfully!");
        reset(); // Reset the form
        setRefreshKey(prev => prev + 1); // Trigger a refresh
      },
      onError: (error) => {
        toast.error(`Failed to post comment: ${error.message}`);
      }
    })
  );
  
  // Like comment mutation
  const likeCommentMutation = useMutation(
    trpc.likeComment.mutationOptions({
      onSuccess: (data, variables) => {
        // Update local state to mark this comment as liked by the user
        likeComment(variables.commentId);
        // No need to refetch as we update the UI optimistically
      },
      onError: (error) => {
        toast.error(`Failed to like comment: ${error.message}`);
      }
    })
  );
  
  // Handle posting a new comment
  const onSubmitComment = (data: CommentFormData) => {
    if (!name) {
      toast.error("Please set your name before posting a comment");
      return;
    }
    
    postCommentMutation.mutate({
      content: data.content,
      author: name,
      avatar: avatar
    });
  };
  
  // Handle liking a comment
  const handleLikeComment = (commentId: number) => {
    if (hasLikedComment(commentId)) {
      return; // Already liked
    }
    
    // Optimistically update UI
    likeComment(commentId);
    
    // Send API request
    likeCommentMutation.mutate({ commentId });
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success("Refreshing comments...");
  };
  
  return (
    <section
      id="community"
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="mb-16 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-6xl">
            Community
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            Connect with fellow innovators, share insights, and collaborate on solutions to global challenges.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-24 lg:grid-cols-2">
          {/* Left column: Featured Story */}
          <div>
            <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-secondary">
              Featured Story
            </div>
            
            <h3 className="mb-6 text-3xl font-bold text-text-dark dark:text-text-light">
              From Prototype to Global Impact: The Water Access Initiative
            </h3>
            
            <div className="mb-8 aspect-video overflow-hidden rounded-lg">
              <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1635001087799-539b4a31e478?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center"></div>
            </div>
            
            <p className="mb-8 text-lg text-text-dark/80 dark:text-text-light/80">
              When Maria Gonzalez entered the Water Access Challenge last year, she had no idea her prototype would soon provide clean water to over 50,000 people across three continents...
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold text-text-dark dark:text-text-light">
                    Maria Gonzalez
                  </p>
                  <p className="text-sm text-text-dark/60 dark:text-text-light/60">
                    Water Access Initiative
                  </p>
                </div>
              </div>
              <a
                href="#read-more"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("Full story coming soon! We're preparing an in-depth case study of Maria's inspiring journey.");
                }}
                className="rounded-full bg-secondary px-6 py-3 text-sm font-medium text-white transition-all hover:bg-secondary-light"
              >
                Read Full Story
              </a>
            </div>
          </div>

          {/* Right column: Discussion Forum */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div className="text-sm font-semibold uppercase tracking-widest text-secondary">
                Discussion Forum
              </div>
              <button 
                onClick={handleRefresh}
                className="flex items-center rounded-full bg-neutral-light/20 dark:bg-neutral-dark/20 px-3 py-1 text-sm text-text-dark dark:text-text-light transition-colors hover:bg-neutral-light/30 dark:hover:bg-neutral-dark/30"
              >
                <RefreshCw size={14} className="mr-2" />
                Refresh
              </button>
            </div>

            {/* User Profile */}
            <UserProfile />

            {/* Comments List */}
            <div className="mb-8">
              {commentsQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-secondary"></div>
                </div>
              ) : commentsQuery.isError ? (
                <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-500">
                  Error loading comments: {commentsQuery.error.message}
                </div>
              ) : commentsQuery.data?.comments.length === 0 ? (
                <div className="rounded-lg bg-neutral-light/10 dark:bg-neutral-dark/10 p-6 text-center text-text-dark/60 dark:text-text-light/60">
                  No comments yet. Be the first to start the conversation!
                </div>
              ) : (
                <div className="divide-y divide-neutral-light/10 dark:divide-neutral-dark/10">
                  {commentsQuery.data?.comments.map((comment) => (
                    <Comment
                      key={comment.id}
                      comment={comment}
                      onLike={handleLikeComment}
                      isLiked={hasLikedComment(comment.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Comment Form */}
            <div className="rounded-lg bg-neutral-light/10 dark:bg-neutral-dark/10 p-6">
              <h4 className="mb-4 text-lg font-medium text-text-dark dark:text-text-light">
                Join the Conversation
              </h4>
              <form onSubmit={handleSubmit(onSubmitComment)}>
                <textarea
                  placeholder="Share your thoughts or ask a question..."
                  {...register("content")}
                  className="mb-4 h-32 w-full resize-none rounded-md border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 px-4 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary"
                ></textarea>
                {errors.content && (
                  <p className="mb-4 text-sm text-secondary">{errors.content.message}</p>
                )}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-text-dark/60 dark:text-text-light/60">
                    {!name && "Set your name in the profile section to comment"}
                  </p>
                  <button 
                    type="submit"
                    disabled={isSubmitting || postCommentMutation.isLoading || !name}
                    className="rounded-full bg-secondary px-6 py-3 text-sm font-medium text-white transition-all hover:bg-secondary-light disabled:opacity-50"
                  >
                    {isSubmitting || postCommentMutation.isLoading ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
