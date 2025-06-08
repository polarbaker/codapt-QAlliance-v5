import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { 
  SITE_CONTENT_TEXT_DEFAULTS, 
  type SiteContentTextType 
} from "~/constants/validation";

// Hook for fetching a single text content
export function useSiteContentText(contentType: SiteContentTextType) {
  const trpc = useTRPC();
  
  const query = useQuery(
    trpc.getSiteContentText.queryOptions({
      contentType,
    }, {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    })
  );
  
  const text = query.data?.textData || SITE_CONTENT_TEXT_DEFAULTS[contentType] || '';
  
  return {
    text,
    isLoading: query.isLoading,
    error: query.error,
    hasCustomText: query.data?.hasCustomText || false,
  };
}

// Hook for fetching multiple text contents at once
export function useBulkSiteContentText(contentTypes: SiteContentTextType[]) {
  const trpc = useTRPC();
  
  const query = useQuery(
    trpc.getBulkSiteContentText.queryOptions({
      contentTypes,
    }, {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    })
  );
  
  const texts = query.data?.texts || {};
  
  // Ensure all requested content types have values (with defaults)
  const completeTexts: Record<string, string> = {};
  for (const contentType of contentTypes) {
    completeTexts[contentType] = texts[contentType] || SITE_CONTENT_TEXT_DEFAULTS[contentType] || '';
  }
  
  return {
    texts: completeTexts,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// Helper function to get text with fallback (for non-hook usage)
export function getSiteContentTextWithFallback(
  data: { textData?: string } | undefined, 
  contentType: SiteContentTextType
): string {
  return data?.textData || SITE_CONTENT_TEXT_DEFAULTS[contentType] || '';
}
