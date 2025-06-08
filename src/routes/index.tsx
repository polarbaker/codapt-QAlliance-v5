import { createFileRoute } from "@tanstack/react-router";
import HeroSection from "~/components/HeroSection";
import AboutSection from "~/components/AboutSection";
import BoldStatementSection from "~/components/BoldStatementSection";
import InnovationPipelineSection from "~/components/InnovationPipelineSection";
import HallOfInnovatorsSection from "~/components/HallOfInnovatorsSection";
import DataInsightsSection from "~/components/DataInsightsSection";
import ChallengeCTASection from "~/components/ChallengeCTASection";
import ImpactMetricsSection from "~/components/ImpactMetricsSection";
import InvestorEngagementSection from "~/components/InvestorEngagementSection";
import JoinUsSection from "~/components/JoinUsSection";
import SocialMediaSection from "~/components/SocialMediaSection";
import FooterSection from "~/components/FooterSection";
import ProblemSubmissionSection from "~/components/ProblemSubmissionSection";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Bold Statement Section */}
      <BoldStatementSection />
      
      {/* About Section */}
      <AboutSection />
      
      {/* Innovation Pipeline Section */}
      <InnovationPipelineSection />
      
      {/* Hall of Innovators Section */}
      <HallOfInnovatorsSection />
      
      {/* Impact Metrics Section */}
      <ImpactMetricsSection />
      
      {/* Data Insights Section */}
      <DataInsightsSection />
      
      {/* Challenge CTA Section */}
      <ChallengeCTASection />
      
      {/* Problem Submission Section */}
      <ProblemSubmissionSection />
      
      {/* Investor Engagement Section */}
      <InvestorEngagementSection />
      
      {/* Join Us Section */}
      <JoinUsSection />
      
      {/* Social Media Section */}
      <SocialMediaSection />
      
      {/* Footer Section */}
      <FooterSection />
    </div>
  );
}
