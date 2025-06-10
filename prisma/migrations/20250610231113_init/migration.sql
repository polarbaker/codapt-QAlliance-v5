-- CreateTable
CREATE TABLE "ProblemSubmission" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "technicalRequirements" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "successCriteria" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "consentToContact" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "ProblemSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "problemId" INTEGER,
    "isGeneralDiscussion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Innovator" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "hasVideo" BOOLEAN NOT NULL DEFAULT false,
    "videoUrl" TEXT,
    "bio" TEXT,
    "achievements" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Innovator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactMetric" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "year" INTEGER NOT NULL,
    "fundsRaised" DOUBLE PRECISION NOT NULL,
    "startupsScaled" INTEGER NOT NULL,
    "regionName" TEXT NOT NULL,
    "regionPercentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ImpactMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unread',

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prize" TEXT NOT NULL,
    "openDate" TIMESTAMP(3),
    "closeDate" TIMESTAMP(3),
    "pilotStartDate" TIMESTAMP(3),
    "partners" TEXT,
    "eligibility" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "video" TEXT,
    "pdfUrl" TEXT,
    "tags" TEXT NOT NULL,
    "impactMetrics" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "altText" TEXT NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "author" TEXT,
    "tags" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "aspectRatio" DOUBLE PRECISION,
    "colorSpace" TEXT,
    "hasAlpha" BOOLEAN NOT NULL DEFAULT false,
    "originalSize" INTEGER,
    "compressionRatio" DOUBLE PRECISION,
    "format" TEXT,
    "quality" INTEGER,
    "processingInfo" TEXT,
    "title" TEXT,
    "description" TEXT,
    "altText" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT,
    "uploadedBy" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageVariant" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageId" INTEGER NOT NULL,
    "variantType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "quality" INTEGER,

    CONSTRAINT "ImageVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageCollection" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "coverImageId" INTEGER,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "totalSize" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImageCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageCollectionItem" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectionId" INTEGER NOT NULL,
    "imageId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImageCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageProcessingJob" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sourceImageId" INTEGER,
    "inputData" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "statusMessage" TEXT,
    "outputData" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImageProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentType" TEXT NOT NULL,
    "imageData" TEXT,
    "textData" TEXT,
    "fileName" TEXT,
    "description" TEXT,
    "altText" TEXT,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Innovator_name_key" ON "Innovator"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_name_key" ON "Partner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Image_filePath_key" ON "Image"("filePath");

-- CreateIndex
CREATE INDEX "Image_category_idx" ON "Image"("category");

-- CreateIndex
CREATE INDEX "Image_tags_idx" ON "Image"("tags");

-- CreateIndex
CREATE INDEX "Image_createdAt_idx" ON "Image"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImageVariant_filePath_key" ON "ImageVariant"("filePath");

-- CreateIndex
CREATE INDEX "ImageVariant_imageId_variantType_idx" ON "ImageVariant"("imageId", "variantType");

-- CreateIndex
CREATE UNIQUE INDEX "ImageCollection_name_key" ON "ImageCollection"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ImageCollection_slug_key" ON "ImageCollection"("slug");

-- CreateIndex
CREATE INDEX "ImageCollection_slug_idx" ON "ImageCollection"("slug");

-- CreateIndex
CREATE INDEX "ImageCollection_isPublic_idx" ON "ImageCollection"("isPublic");

-- CreateIndex
CREATE INDEX "ImageCollectionItem_collectionId_order_idx" ON "ImageCollectionItem"("collectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ImageCollectionItem_collectionId_imageId_key" ON "ImageCollectionItem"("collectionId", "imageId");

-- CreateIndex
CREATE INDEX "ImageProcessingJob_status_priority_idx" ON "ImageProcessingJob"("status", "priority");

-- CreateIndex
CREATE INDEX "ImageProcessingJob_createdAt_idx" ON "ImageProcessingJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteContent_contentType_key" ON "SiteContent"("contentType");

-- CreateIndex
CREATE INDEX "SiteContent_contentType_idx" ON "SiteContent"("contentType");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "ProblemSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageVariant" ADD CONSTRAINT "ImageVariant_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageCollectionItem" ADD CONSTRAINT "ImageCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ImageCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
