# Image Upload Troubleshooting Guide

This guide helps resolve common image upload issues, particularly memory-related problems and format compatibility issues.

## Quick Fixes for Common Issues

### 1. "Insufficient memory to resize image" Error

**Symptoms:**
- Upload fails with memory-related error messages
- Large images (>10MB) fail to process
- Multiple image uploads fail

**Solutions:**
1. **Reduce image size before uploading:**
   - Compress images to under 10MB using tools like TinyPNG, Squoosh, or Photoshop
   - Resize dimensions to 2048x2048 pixels or smaller for web use
   - Convert to JPEG format for better compression

2. **Upload fewer images at once:**
   - Upload maximum 5 images per batch instead of 10
   - Wait between uploads to allow memory to clear

3. **System administrator fixes:**
   - Increase Docker container memory limits
   - Restart the application to clear memory
   - Check system memory usage

### 2. "Unsupported image format" Error

**Supported Formats:**
- ✅ JPEG (.jpg, .jpeg) - Recommended for photos
- ✅ PNG (.png) - Recommended for images with transparency
- ✅ WebP (.webp) - Modern format with excellent compression
- ✅ GIF (.gif) - Supported, animated GIFs become static
- ✅ BMP (.bmp) - Converted to web-friendly format
- ✅ TIFF (.tiff, .tif) - Converted to JPEG/PNG
- ⚠️ HEIC/HEIF (.heic, .heif) - Requires conversion first
- ⚠️ SVG (.svg) - Rasterized during processing
- ❌ RAW formats - Not supported

**Solutions for unsupported formats:**
1. **HEIC/HEIF files (iPhone photos):**
   - iPhone: Settings > Camera > Formats > Most Compatible
   - Convert using online tools or export as JPEG from Photos app

2. **SVG files:**
   - Export as PNG from design software (Illustrator, Figma, etc.)
   - Use online SVG to PNG converters

3. **RAW files:**
   - Process in photo editing software first
   - Export as JPEG or PNG

### 3. Upload Timeout Issues

**Symptoms:**
- Upload process hangs or times out
- "Processing timed out" error messages

**Solutions:**
1. **Check internet connection stability**
2. **Reduce file sizes:**
   - Compress images before uploading
   - Use JPEG instead of PNG for photos
3. **Upload during off-peak hours**
4. **Try uploading one image at a time**

## Image Optimization Best Practices

### Recommended Image Specifications

| Use Case | Max Dimensions | Max File Size | Recommended Format |
|----------|---------------|---------------|-------------------|
| Profile photos | 800x800px | 2MB | JPEG or PNG |
| Hero images | 1920x1080px | 5MB | JPEG or WebP |
| Gallery images | 1600x1600px | 3MB | JPEG or WebP |
| Thumbnails | 400x400px | 500KB | JPEG |
| Logos | 800x400px | 1MB | PNG (with transparency) |

### File Size Optimization

1. **Use appropriate compression:**
   - JPEG: 80-85% quality for photos
   - PNG: Use PNG-8 for simple graphics, PNG-24 for complex images
   - WebP: 75-80% quality for excellent compression

2. **Resize dimensions appropriately:**
   - Web images rarely need to be larger than 1920px wide
   - Profile images work well at 400-800px
   - Thumbnails should be 150-300px

3. **Remove unnecessary metadata:**
   - Strip EXIF data to reduce file size
   - Remove color profiles unless specifically needed

## Memory Management

### For Users

1. **Upload Strategy:**
   - Upload 3-5 images at a time maximum
   - Wait for each batch to complete before starting the next
   - Use smaller file sizes when possible

2. **Image Preparation:**
   - Compress images before uploading
   - Convert large PNG files to JPEG if transparency isn't needed
   - Resize oversized images

### For System Administrators

1. **Monitor Memory Usage:**
   ```bash
   # Check container memory usage
   docker stats

   # Check application logs for memory warnings
   docker logs <container_name> | grep -i memory
   ```

2. **Increase Memory Limits:**
   ```yaml
   # In docker-compose.yaml
   services:
     app:
       deploy:
         resources:
           limits:
             memory: 6gb  # Increase from 4gb
           reservations:
             memory: 3gb  # Increase from 2gb
   ```

3. **Restart Application:**
   ```bash
   # Restart to clear memory
   docker-compose restart app
   ```

## Error Messages and Solutions

### "Image processing failed due to file format or corruption issues"
- **Cause:** Corrupted file or unsupported format variant
- **Solution:** Re-save the image in a standard image editor, try a different file

### "Image file appears to be corrupted or incomplete"
- **Cause:** File download was interrupted or file is damaged
- **Solution:** Re-download the original image, try a different source

### "Total file size exceeds the limit"
- **Cause:** Batch upload size is too large
- **Solution:** Upload fewer images or compress files first

### "System memory too high to safely process image"
- **Cause:** Server memory is critically low
- **Solution:** Wait a few minutes and try again, or contact administrator

## Advanced Troubleshooting

### Check Image File Integrity
```bash
# On Linux/Mac, check if image is valid
file image.jpg
identify image.jpg  # If ImageMagick is installed
```

### Convert HEIC to JPEG (Command Line)
```bash
# Using ImageMagick
magick convert image.heic image.jpg

# Using FFmpeg
ffmpeg -i image.heic image.jpg
```

### Batch Image Compression
```bash
# Using ImageMagick to compress all JPEG files
mogrify -quality 85 -resize 1920x1920> *.jpg
```

## Getting Help

If you continue to experience issues:

1. **Check the application logs** for specific error messages
2. **Try uploading a different image** to isolate the problem
3. **Contact your system administrator** with:
   - The specific error message
   - The image file you're trying to upload
   - Your browser and operating system
   - The time when the error occurred

## System Requirements

### Minimum System Requirements
- 4GB RAM available to Docker containers
- 2GB free disk space
- Stable internet connection

### Recommended System Requirements
- 8GB RAM available to Docker containers
- 10GB free disk space
- High-speed internet connection

### Browser Requirements
- Modern browser with JavaScript enabled
- Support for File API and drag-and-drop
- Recommended: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
