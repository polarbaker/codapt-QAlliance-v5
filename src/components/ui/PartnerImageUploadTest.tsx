import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { partnerSchema } from '~/constants/validation';
import * as z from 'zod';
import { SimplePartnerImageUpload } from './SimplePartnerImageUpload';
import { ImagePreview } from './ImagePreview';
import { Building } from 'lucide-react';

type PartnerFormData = z.infer<typeof partnerSchema>;

interface PartnerImageUploadTestProps {
  partnerId: number;
  partnerName: string;
  initialLogoUrl?: string;
}

export function PartnerImageUploadTest({ 
  partnerId, 
  partnerName, 
  initialLogoUrl = '' 
}: PartnerImageUploadTestProps) {
  const [debugMode] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [lastImageUpdate, setLastImageUpdate] = useState<Date | null>(null);
  
  const {
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      logoUrl: initialLogoUrl,
      name: partnerName,
      altText: `${partnerName} logo`,
      visible: true,
      order: 0,
    },
  });

  const logoUrl = watch("logoUrl");

  // Enhanced logging
  const logWithTimestamp = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`🧪 TEST: PartnerImageUploadTest [${new Date().toISOString()}] - ${message}`, data || '');
    }
  }, [debugMode]);

  // Handle logo change from upload component
  const handleLogoChange = useCallback((filePath: string | string[] | null) => {
    logWithTimestamp('Upload component onChange called:', {
      filePath: filePath,
      filePathType: typeof filePath,
      filePathLength: typeof filePath === 'string' ? filePath?.length : 0,
      isBase64: typeof filePath === 'string' && filePath.startsWith('data:'),
      currentFormValue: logoUrl,
    });
    
    const pathValue = typeof filePath === 'string' ? filePath : null;
    
    if (pathValue && pathValue.trim() !== '') {
      setValue("logoUrl", pathValue, { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      
      setPreviewKey(prev => prev + 1);
      setLastImageUpdate(new Date());
      
      logWithTimestamp('Form field updated:', {
        newValue: pathValue,
        newValueLength: pathValue.length,
        isBase64: pathValue.startsWith('data:'),
        previewKey: previewKey + 1,
      });
    } else if (filePath === null) {
      setValue("logoUrl", "", { 
        shouldValidate: true, 
        shouldDirty: true,
        shouldTouch: true
      });
      setPreviewKey(prev => prev + 1);
    }
  }, [setValue, logoUrl, previewKey, logWithTimestamp]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center space-x-2">
          <Building className="h-5 w-5 text-blue-600" />
          <span>Partner Image Upload Test</span>
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Upload Component
            </h3>
            
            <SimplePartnerImageUpload
              partnerId={partnerId}
              partnerName={partnerName}
              value={logoUrl}
              onChange={handleLogoChange}
              onUploadComplete={(result) => {
                logWithTimestamp('Upload completed:', result);
              }}
              onUploadError={(error) => {
                logWithTimestamp('Upload error:', error);
              }}
              enableAutoRetry={true}
              maxRetries={3}
              componentId={`test-partner-upload-${partnerId}`}
            />
            
            {errors.logoUrl && (
              <p className="text-sm text-red-600">{errors.logoUrl.message}</p>
            )}
          </div>

          {/* Preview Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Preview Component
            </h3>
            
            <ImagePreview
              imagePath={logoUrl}
              alt={`${partnerName} logo preview`}
              className="h-48"
              placeholderIcon={Building}
              placeholderText="Logo preview will appear here"
              showFileName={true}
              key={previewKey}
              updatedAt={lastImageUpdate}
              enableEventListening={true}
              debugMode={debugMode}
              componentId={`test-preview-${partnerId}`}
            />
          </div>
        </div>

        {/* Debug Information */}
        {debugMode && (
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Debug Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs space-y-1">
              <div className="space-y-1">
                <div><strong>Partner ID:</strong> {partnerId}</div>
                <div><strong>Partner Name:</strong> {partnerName}</div>
                <div><strong>Form Logo URL:</strong> {logoUrl || 'Empty'}</div>
                <div><strong>Logo URL Type:</strong> {typeof logoUrl}</div>
                <div><strong>Logo URL Length:</strong> {logoUrl?.length || 0}</div>
                <div><strong>Is Base64:</strong> {logoUrl?.startsWith('data:') ? 'Yes' : 'No'}</div>
              </div>
              <div className="space-y-1">
                <div><strong>Preview Key:</strong> {previewKey}</div>
                <div><strong>Last Update:</strong> {lastImageUpdate ? lastImageUpdate.toISOString() : 'None'}</div>
                <div><strong>Form Errors:</strong> {errors.logoUrl ? 'Yes' : 'No'}</div>
                <div><strong>Error Message:</strong> {errors.logoUrl?.message || 'None'}</div>
              </div>
            </div>
            
            {logoUrl && logoUrl.startsWith('data:') && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <div className="text-xs text-green-800 dark:text-green-200">
                  <div><strong>Base64 Data Analysis:</strong></div>
                  <div>Data URL: {logoUrl.substring(0, 50)}...</div>
                  <div>Size: {Math.round(logoUrl.length / 1024)}KB</div>
                  <div>MIME Type: {logoUrl.match(/data:([^;]+)/)?.[1] || 'Unknown'}</div>
                  <div>Has Base64 Marker: {logoUrl.includes('base64,') ? 'Yes' : 'No'}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
