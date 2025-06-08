import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState, useCallback, useEffect } from "react";
import { useUserStore } from "~/stores/userStore";
import { useTRPC } from "~/trpc/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { challengeSchema, type ChallengeFormData, CHALLENGE_CATEGORIES, CHALLENGE_REGIONS, CHALLENGE_STATUSES } from "~/constants/validation";
import {
  ArrowLeft,
  Save,
  Trophy,
  Loader2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SimpleChallengeImageUpload } from "~/components/ui/SimpleChallengeImageUpload";
import { ImagePreview } from "~/components/ui/ImagePreview";

export const Route = createFileRoute("/admin/challenges/$challengeId/edit/")({
  component: EditChallengePage,
});

// Helper to format date for input type="date"
const formatDateForInput = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

function EditChallengePage() {
  const { adminToken } = useUserStore();
  const navigate = useNavigate();
  const params = useParams({ from: "/admin/challenges/$challengeId/edit/" });
  const challengeId = parseInt(params.challengeId);
  const queryClient = useQueryClient();

  const [previewKey, setPreviewKey] = useState(0);
  const [lastImageUpdate, setLastImageUpdate] = useState<Date | null>(null);
  const [debugMode] = useState(true);

  const trpc = useTRPC();

  const challengeQuery = useQuery(
    trpc.adminGetChallengeById.queryOptions({
      adminToken: adminToken || "",
      id: challengeId,
    })
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, ...formState },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      image: "", 
    },
  });

  useEffect(() => {
    if (challengeQuery.data) {
      const challenge = challengeQuery.data;
      reset({
        ...challenge,
        image: challenge.image || "",
        openDate: formatDateForInput(challenge.openDate),
        closeDate: formatDateForInput(challenge.closeDate),
        pilotStartDate: formatDateForInput(challenge.pilotStartDate),
      });
      setLastImageUpdate(new Date(challenge.updatedAt));
      setPreviewKey(prev => prev + 1);
    }
  }, [challengeQuery.data, reset]);

  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🔍 DEBUG: EditChallengeForm [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);

  const imageUrl = watch("image");

  const handleImageChange = useCallback((filePath: string | string[] | null) => {
    const pathValue = typeof filePath === 'string' ? filePath : null;
    if (pathValue !== null) {
      setValue("image", pathValue, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
      setTimeout(() => trigger("image"), 100);
    } else {
       setValue("image", "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
       setPreviewKey(prev => prev + 1);
    }
  }, [setValue, trigger, logWithTimestamp]);

  useEffect(() => {
    const handleImageUpdated = (event: CustomEvent) => {
      const { filePath: eventFilePath, component } = event.detail || {};
      if (eventFilePath && (eventFilePath === imageUrl || component === 'SimpleChallengeImageUpload')) {
        if (eventFilePath !== imageUrl && eventFilePath.trim() !== '') {
          setValue("image", eventFilePath, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        }
        setPreviewKey(prev => prev + 1);
        setLastImageUpdate(new Date());
        setTimeout(() => trigger("image"), 100);
      }
    };
    window.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    document.addEventListener('imageUpdated', handleImageUpdated as EventListener);
    return () => {
      window.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
      document.removeEventListener('imageUpdated', handleImageUpdated as EventListener);
    };
  }, [imageUrl, setValue, trigger, logWithTimestamp]);
  
  useEffect(() => {
    if (imageUrl && imageUrl.trim() !== '') {
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
    }
    if (imageUrl && imageUrl.trim() !== '' && errors.image) {
      setTimeout(() => trigger("image"), 100);
    }
  }, [imageUrl, errors.image, trigger, logWithTimestamp]);

  const updateMutation = useMutation(
    trpc.adminUpdateChallenge.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['adminGetChallenges'] });
        await queryClient.invalidateQueries({ queryKey: ['adminGetChallengeById', { id: challengeId }] });
        toast.success("Challenge updated successfully");
        navigate({ to: "/admin/challenges" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const onSubmit = (data: ChallengeFormData) => {
    updateMutation.mutate({
      adminToken: adminToken || "",
      id: challengeId,
      data,
    });
  };

  if (challengeQuery.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        <p className="ml-2">Loading challenge...</p>
      </div>
    );
  }

  if (challengeQuery.isError || !challengeQuery.data) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-600">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Error loading challenge: {challengeQuery.error?.message || "Challenge not found."}</p>
        <Link to="/admin/challenges" className="mt-4 text-blue-600 hover:underline">
          Back to Challenges
        </Link>
      </div>
    );
  }
  
  const currentChallengeTitle = watch("title") || challengeQuery.data?.title || "Challenge";

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <Link to="/admin/challenges" className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Challenges</span>
          </Link>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Edit Challenge
              </h1>
              <p className="text-text-muted dark:text-text-light/70 line-clamp-1">
                {currentChallengeTitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Fields similar to NewChallengePage, pre-filled */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Title *</label>
                      <input type="text" {...register("title")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Tagline *</label>
                      <input type="text" {...register("tagline")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.tagline && <p className="mt-1 text-sm text-red-600">{errors.tagline.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Category *</label>
                      <select {...register("category")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary">
                        {CHALLENGE_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                      </select>
                      {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Region *</label>
                      <select {...register("region")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary">
                        {CHALLENGE_REGIONS.map((reg) => (<option key={reg} value={reg}>{reg}</option>))}
                      </select>
                      {errors.region && <p className="mt-1 text-sm text-red-600">{errors.region.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Status *</label>
                      <select {...register("status")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary">
                        {CHALLENGE_STATUSES.map((stat) => (<option key={stat} value={stat}>{stat}</option>))}
                      </select>
                      {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Prize *</label>
                      <input type="text" {...register("prize")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.prize && <p className="mt-1 text-sm text-red-600">{errors.prize.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Image *</label>
                      <SimpleChallengeImageUpload
                        challengeId={challengeId}
                        challengeTitle={currentChallengeTitle}
                        value={imageUrl}
                        onChange={handleImageChange}
                        componentId={`simple-challenge-upload-edit-${challengeId}`}
                      />
                      {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Open Date</label>
                      <input type="date" {...register("openDate")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.openDate && <p className="mt-1 text-sm text-red-600">{errors.openDate.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Close Date</label>
                      <input type="date" {...register("closeDate")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.closeDate && <p className="mt-1 text-sm text-red-600">{errors.closeDate.message}</p>}
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Pilot Start Date</label>
                      <input type="date" {...register("pilotStartDate")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.pilotStartDate && <p className="mt-1 text-sm text-red-600">{errors.pilotStartDate.message}</p>}
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Partners</label>
                      <textarea {...register("partners")} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.partners && <p className="mt-1 text-sm text-red-600">{errors.partners.message}</p>}
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Eligibility</label>
                      <textarea {...register("eligibility")} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.eligibility && <p className="mt-1 text-sm text-red-600">{errors.eligibility.message}</p>}
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Order</label>
                      <input type="number" {...register("order", {valueAsNumber: true})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.order && <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>}
                    </div>
                    <div className="lg:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" {...register("featured")} className="rounded border-gray-300 text-secondary focus:ring-secondary" />
                        <span className="text-sm font-medium text-text-dark dark:text-text-light">Featured Challenge</span>
                      </label>
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">Description *</label>
                      <textarea {...register("description")} rows={8} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary focus:border-secondary" />
                      {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
                    <button type="submit" disabled={isSubmitting || updateMutation.isPending} className="flex items-center space-x-2 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Save className="h-4 w-4" />
                      <span>{isSubmitting || updateMutation.isPending ? "Saving..." : "Save Changes"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-text-dark dark:text-text-light mb-4">Image Preview</h3>
                <div className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <ImagePreview
                    imagePath={imageUrl}
                    alt="Challenge image preview"
                    className="h-full"
                    placeholderIcon={Trophy}
                    updatedAt={lastImageUpdate || undefined}
                    key={previewKey}
                    debugMode={debugMode}
                  />
                </div>
                {debugMode && (
                  <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                    <div>Image URL: {imageUrl || 'None'}</div>
                    <div>Preview Key: {previewKey}</div>
                    <div>Last Update: {lastImageUpdate ? lastImageUpdate.toISOString() : 'None'}</div>
                    <div>Form Valid: {formState.isValid ? '✅' : '❌'}</div>
                    <div>Image Error: {errors.image ? `❌ ${errors.image.message}` : '✅'}</div>
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
