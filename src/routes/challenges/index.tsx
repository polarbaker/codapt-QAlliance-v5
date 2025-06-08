import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, Trophy } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import ChallengeFilters from "~/components/ChallengeFilters";
import ChallengeCard, { ChallengeData } from "~/components/ChallengeCard";
import ChallengeDetailModal from "~/components/ChallengeDetailModal";
import ChallengeCTASection from "~/components/ChallengeCTASection";
import { CHALLENGE_CATEGORIES, CHALLENGE_REGIONS, CHALLENGE_STATUSES } from "~/constants/validation";

export const Route = createFileRoute("/challenges/")({
  component: Challenges,
});

function Challenges() {
  const trpc = useTRPC();
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination state
  const [allChallenges, setAllChallenges] = useState<ChallengeData[]>([]);
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Modal state
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Breadcrumb component
  const Breadcrumb = () => (
    <nav className="mb-8" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm text-text-light/60">
        <li>
          <a href="/" className="hover:text-text-light transition-colors">
            Home
          </a>
        </li>
        <li>
          <span className="mx-2">/</span>
        </li>
        <li className="text-text-light font-medium">Challenges</li>
      </ol>
    </nav>
  );

  // Fetch challenges with filters
  const challengesQuery = useQuery(
    trpc.getChallenges.queryOptions({
      limit: 20,
      category: selectedCategory || undefined,
      region: selectedRegion || undefined,
      status: selectedStatus || undefined,
      search: searchQuery || undefined,
    })
  );

  // Update challenges list when query data changes
  useEffect(() => {
    if (challengesQuery.data) {
      setAllChallenges(challengesQuery.data.challenges);
      setNextCursor(challengesQuery.data.nextCursor);
    }
  }, [challengesQuery.data]);

  // Reset pagination when filters change
  useEffect(() => {
    setAllChallenges([]);
    setNextCursor(undefined);
  }, [selectedCategory, selectedRegion, selectedStatus, searchQuery]);

  // Load more challenges
  const loadMoreChallenges = async () => {
    if (!nextCursor || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const moreData = await trpc.getChallenges.query({
        limit: 20,
        cursor: nextCursor,
        category: selectedCategory || undefined,
        region: selectedRegion || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      });
      
      setAllChallenges(prev => [...prev, ...moreData.challenges]);
      setNextCursor(moreData.nextCursor);
    } catch (error) {
      console.error('Error loading more challenges:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch featured challenges for hero section
  const featuredChallengesQuery = useQuery(
    trpc.getFeaturedChallenges.queryOptions({
      limit: 3,
    })
  );

  const handleChallengeClick = (challenge: ChallengeData) => {
    setSelectedChallenge(challenge);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChallenge(null);
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedRegion(null);
    setSelectedStatus(null);
    setSearchQuery("");
  };

  const featuredChallenges = featuredChallengesQuery.data || [];
  const isLoading = challengesQuery.isLoading;
  const isError = challengesQuery.isError;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-24">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-background-black via-neutral-dark to-background-black">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center mb-16">
            <Breadcrumb />
            <h1 className="mb-8 text-4xl font-extrabold leading-tight text-text-light md:text-6xl lg:text-7xl">
              Innovation <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Challenges</span>
            </h1>
            <p className="mx-auto max-w-3xl text-lg font-light text-text-light/80 md:text-xl lg:text-2xl">
              Join global challenges that are shaping the future. Apply your expertise to solve real-world problems and make a lasting impact.
            </p>
          </div>

          {/* Featured Challenges */}
          {featuredChallenges.length > 0 && (
            <div className="mb-12 md:mb-16">
              <div className="flex items-center justify-center mb-6 md:mb-8">
                <Trophy className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8 text-secondary" />
                <h2 className="text-2xl md:text-3xl font-bold text-text-light">Featured Challenges</h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {featuredChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onClick={handleChallengeClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-neutral-light/10 dark:bg-neutral-dark/10">
        <div className="mx-auto max-w-7xl container-padding">
          <ChallengeFilters
            categories={Array.from(CHALLENGE_CATEGORIES)}
            regions={Array.from(CHALLENGE_REGIONS)}
            statuses={Array.from(CHALLENGE_STATUSES)}
            selectedCategory={selectedCategory}
            selectedRegion={selectedRegion}
            selectedStatus={selectedStatus}
            searchQuery={searchQuery}
            onCategoryChange={setSelectedCategory}
            onRegionChange={setSelectedRegion}
            onStatusChange={setSelectedStatus}
            onSearchChange={setSearchQuery}
            onClearFilters={handleClearFilters}
          />

          {/* Results Count */}
          <div className="mb-8 text-text-dark/60 dark:text-text-light/60">
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading challenges...
              </div>
            ) : isError ? (
              <div className="flex items-center text-red-500">
                <AlertCircle className="mr-2 h-4 w-4" />
                Error loading challenges
              </div>
            ) : (
              `Showing ${allChallenges.length} challenge${allChallenges.length !== 1 ? 's' : ''}${nextCursor ? ' (more available)' : ''}`
            )}
          </div>
        </div>
      </section>

      {/* Challenges Grid */}
      <section className="py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl container-padding">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-secondary mb-4" />
                <p className="text-text-dark dark:text-text-light">Loading challenges...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="text-center py-16">
              <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-2xl font-bold text-text-dark dark:text-text-light mb-2">
                Unable to load challenges
              </h3>
              <p className="text-text-dark/60 dark:text-text-light/60 mb-6">
                There was an error loading the challenges. Please try again later.
              </p>
              <button
                onClick={() => challengesQuery.refetch()}
                className="rounded-full bg-secondary px-6 py-3 text-white transition-all hover:bg-secondary-light"
              >
                Try Again
              </button>
            </div>
          ) : allChallenges.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-16 w-16 rounded-full bg-neutral-light/20 dark:bg-neutral-dark/20 flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-text-dark/40 dark:text-text-light/40" />
              </div>
              <h3 className="text-2xl font-bold text-text-dark dark:text-text-light mb-2">
                No challenges found
              </h3>
              <p className="text-text-dark/60 dark:text-text-light/60 mb-6">
                Try adjusting your search criteria or filters to find challenges.
              </p>
              <button
                onClick={handleClearFilters}
                className="rounded-full bg-secondary px-6 py-3 text-white transition-all hover:bg-secondary-light"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {allChallenges.map((challenge, index) => (
                  <div
                    key={challenge.id}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${(index % 12) * 0.1}s` }}
                  >
                    <ChallengeCard
                      challenge={challenge}
                      onClick={handleChallengeClick}
                    />
                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {nextCursor && (
                <div className="text-center mt-8 md:mt-12">
                  <button
                    onClick={loadMoreChallenges}
                    disabled={isLoadingMore}
                    className="rounded-full bg-secondary px-6 md:px-8 py-3 md:py-4 text-sm md:text-base text-white transition-all hover:bg-secondary-light hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                        <span className="hidden sm:inline">Loading more challenges...</span>
                        <span className="sm:hidden">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Load More Challenges</span>
                        <span className="sm:hidden">Load More</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <ChallengeCTASection />

      {/* Challenge Detail Modal */}
      <ChallengeDetailModal
        challenge={selectedChallenge}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
