import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, MapPin, Calendar, DollarSign } from "lucide-react";

export const Route = createFileRoute("/challenges/")({
  component: Challenges,
});

// Mock challenge data - in a real app, this would come from tRPC
const mockChallenges = [
  {
    id: 1,
    title: "Climate Resilient Agriculture",
    tagline: "Develop drought-resistant farming solutions for sub-Saharan Africa",
    category: "Climate",
    region: "Africa",
    status: "Active",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop",
    description: "Design innovative agricultural technologies that can withstand extreme weather conditions while maintaining food security for vulnerable populations.",
    prize: "$250,000",
    openDate: "2024-01-15",
    closeDate: "2024-06-30",
    featured: true,
  },
  {
    id: 2,
    title: "Digital Health Infrastructure",
    tagline: "Create scalable telemedicine platforms for rural communities",
    category: "Digital",
    region: "Global",
    status: "Submissions Open",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&fit=crop",
    description: "Build accessible digital health solutions that can operate in low-bandwidth environments and provide quality healthcare to underserved areas.",
    prize: "$400,000",
    openDate: "2024-02-01",
    closeDate: "2024-07-15",
    featured: true,
  },
  {
    id: 3,
    title: "Clean Water Innovation",
    tagline: "Develop affordable water purification systems",
    category: "Health",
    region: "Asia",
    status: "Active",
    image: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=600&h=400&fit=crop",
    description: "Create cost-effective water treatment technologies that can provide clean drinking water to communities without reliable infrastructure.",
    prize: "$180,000",
    openDate: "2024-01-01",
    closeDate: "2024-05-31",
    featured: false,
  },
  {
    id: 4,
    title: "Renewable Energy Storage",
    tagline: "Next-generation battery solutions for grid stability",
    category: "Climate",
    region: "Europe",
    status: "Coming Soon",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&h=400&fit=crop",
    description: "Develop advanced energy storage systems that can support renewable energy integration at scale.",
    prize: "$500,000",
    openDate: "2024-04-01",
    closeDate: "2024-09-30",
    featured: true,
  },
  {
    id: 5,
    title: "Education Technology Access",
    tagline: "Bridge the digital divide in education",
    category: "Digital",
    region: "South America",
    status: "Active",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop",
    description: "Design educational technology solutions that work offline and can reach students in remote areas.",
    prize: "$150,000",
    openDate: "2024-01-20",
    closeDate: "2024-06-15",
    featured: false,
  },
  {
    id: 6,
    title: "Urban Air Quality",
    tagline: "Smart solutions for cleaner cities",
    category: "Health",
    region: "Asia",
    status: "Submissions Open",
    image: "https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=600&h=400&fit=crop",
    description: "Create innovative air purification and monitoring systems for urban environments.",
    prize: "$300,000",
    openDate: "2024-02-15",
    closeDate: "2024-08-01",
    featured: false,
  },
];

function Challenges() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Filter challenges based on search and filters
  const filteredChallenges = mockChallenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.tagline.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || challenge.category === selectedCategory;
    const matchesRegion = selectedRegion === "All" || challenge.region === selectedRegion;
    const matchesStatus = selectedStatus === "All" || challenge.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesRegion && matchesStatus;
  });

  const categories = ["All", "Climate", "Digital", "Health"];
  const regions = ["All", "Global", "Africa", "Asia", "Europe", "North America", "South America"];
  const statuses = ["All", "Active", "Submissions Open", "Coming Soon"];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-24">
      {/* Hero Section */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center mb-16">
            <h1 className="mb-8 text-6xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-7xl">
              Innovation <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Challenges</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
              Join global challenges that are shaping the future. Apply your expertise to solve real-world problems and make a lasting impact.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="section-padding bg-neutral-light/20 dark:bg-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-dark/40 dark:text-text-light/40" />
              <input
                type="text"
                placeholder="Search challenges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border-0 bg-background-light dark:bg-background-black py-4 pl-12 pr-6 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 shadow-sm focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border-0 bg-background-light dark:bg-background-black py-3 px-4 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light">Region</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full rounded-lg border-0 bg-background-light dark:bg-background-black py-3 px-4 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary"
              >
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-dark dark:text-text-light">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border-0 bg-background-light dark:bg-background-black py-3 px-4 text-text-dark dark:text-text-light focus:ring-2 focus:ring-secondary"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                  setSelectedRegion("All");
                  setSelectedStatus("All");
                }}
                className="w-full rounded-lg bg-secondary px-4 py-3 text-white transition-colors hover:bg-secondary-light"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-6 text-text-dark/60 dark:text-text-light/60">
            Showing {filteredChallenges.length} of {mockChallenges.length} challenges
          </div>
        </div>
      </section>

      {/* Challenges Grid */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          {filteredChallenges.length === 0 ? (
            <div className="text-center py-16">
              <Filter className="mx-auto h-16 w-16 text-text-dark/40 dark:text-text-light/40 mb-4" />
              <h3 className="text-2xl font-bold text-text-dark dark:text-text-light mb-2">No challenges found</h3>
              <p className="text-text-dark/60 dark:text-text-light/60">Try adjusting your search criteria or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredChallenges.map(challenge => (
                <div key={challenge.id} className="group overflow-hidden rounded-lg bg-background-light dark:bg-neutral-dark/30 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                  {/* Challenge Image */}
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={challenge.image}
                      alt={challenge.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>

                  {/* Challenge Content */}
                  <div className="p-6">
                    {/* Status Badge */}
                    <div className="mb-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        challenge.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        challenge.status === 'Submissions Open' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {challenge.status}
                      </span>
                    </div>

                    {/* Title and Tagline */}
                    <h3 className="mb-2 text-xl font-bold text-text-dark dark:text-text-light group-hover:text-secondary transition-colors">
                      {challenge.title}
                    </h3>
                    <p className="mb-4 text-sm text-secondary font-medium">{challenge.tagline}</p>
                    <p className="mb-6 text-text-dark/80 dark:text-text-light/80 line-clamp-3">
                      {challenge.description}
                    </p>

                    {/* Challenge Details */}
                    <div className="space-y-2 mb-6 text-sm text-text-dark/60 dark:text-text-light/60">
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>{challenge.region}</span>
                        <span className="mx-2">•</span>
                        <span>{challenge.category}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        <span>Prize: {challenge.prize}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Closes: {new Date(challenge.closeDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button className="w-full rounded-full bg-secondary px-6 py-3 text-white transition-all hover:bg-secondary-light hover:scale-105">
                      {challenge.status === 'Coming Soon' ? 'Learn More' : 'Apply Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="section-padding bg-neutral-light/20 dark:bg-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center">
            <h2 className="mb-6 text-4xl font-bold text-text-dark dark:text-text-light">
              Don't see a challenge that fits?
            </h2>
            <p className="mb-8 text-xl text-text-dark/80 dark:text-text-light/80">
              We're always looking for new problems to solve. Submit your own challenge idea.
            </p>
            <a
              href="/submit-a-challenge"
              className="inline-block rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light hover:scale-105"
            >
              Submit a Challenge
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
