import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * BulletproofImageUpload - DISABLED
 * 
 * This component has been disabled as part of the system simplification.
 * The upload system now uses only SimpleInnovatorImageUpload for reliability.
 * 
 * This file is preserved for reference but the component is non-functional.
 */

interface BulletproofImageUploadProps {
  [key: string]: any;
}

export const BulletproofImageUpload: React.FC<BulletproofImageUploadProps> = (props) => {
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3">
        <AlertCircle className="h-8 w-8 text-gray-400" />
        <div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Advanced Upload Disabled
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The advanced upload system has been disabled. Please use the simple upload method instead.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            This change improves reliability and simplifies the upload process.
          </p>
        </div>
      </div>
    </div>
  );
};

// Add display name for debugging
BulletproofImageUpload.displayName = 'BulletproofImageUpload (Disabled)';

export default BulletproofImageUpload;
