import { createFileRoute } from "@tanstack/react-router";
import { useUserStore } from "~/stores/userStore";
import { PartnerImageUploadTest } from "~/components/ui/PartnerImageUploadTest";
import { ArrowLeft, TestTube } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/test-partner-upload/")({
  component: TestPartnerUploadPage,
});

function TestPartnerUploadPage() {
  const { adminToken } = useUserStore();

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-black">
        <div className="container-padding">
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-text-muted dark:text-text-light/70 mb-4">
                Authentication required to test partner upload
              </p>
              <Link
                to="/admin"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go to Admin</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black">
      <div className="container-padding">
        {/* Header */}
        <div className="flex items-center justify-between py-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/partners"
              className="flex items-center space-x-2 text-text-muted dark:text-text-light/70 hover:text-text-dark dark:hover:text-text-light transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Partners</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2 text-amber-600">
            <TestTube className="h-5 w-5" />
            <span className="text-sm font-medium">Test Environment</span>
          </div>
        </div>

        <div className="py-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <TestTube className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-dark dark:text-text-light">
                Partner Image Upload Test
              </h1>
              <p className="text-text-muted dark:text-text-light/70">
                Test the partner image upload and preview functionality
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Test Cases */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-6">
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4">
                Test Instructions
              </h2>
              <div className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
                <p>1. Use the upload component below to select and upload a partner logo</p>
                <p>2. Verify that the preview updates immediately after upload</p>
                <p>3. Check the debug information to ensure base64 data is flowing correctly</p>
                <p>4. Test with different image formats (JPEG, PNG, WebP)</p>
                <p>5. Test with different image sizes (small, medium, large)</p>
              </div>
            </div>

            {/* Test with existing partner */}
            <PartnerImageUploadTest
              partnerId={1}
              partnerName="Test Partner 1"
              initialLogoUrl=""
            />

            {/* Test with different partner */}
            <PartnerImageUploadTest
              partnerId={2}
              partnerName="Test Partner 2"
              initialLogoUrl=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}
