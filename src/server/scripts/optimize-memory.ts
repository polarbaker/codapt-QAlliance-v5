import sharp from 'sharp';

// Memory optimization configuration for image processing
export function optimizeMemorySettings(): void {
  console.log('Configuring memory optimization settings...');
  
  try {
    // Configure Sharp for production memory efficiency
    sharp.cache(false); // Disable cache to save memory
    sharp.concurrency(1); // Limit to single-threaded processing for memory control
    sharp.simd(false); // Disable SIMD for more predictable memory usage
    
    // Set Sharp resource limits
    sharp.limitInputPixels(67108864); // ~8192x8192 max pixels (reduced for memory)
    
    console.log('Sharp configuration applied:');
    console.log('- Cache: disabled');
    console.log('- Concurrency: 1 thread');
    console.log('- SIMD: disabled');
    console.log('- Max input pixels: 67,108,864 (~8192x8192)');
    
    // Configure garbage collection if available
    if (global.gc) {
      console.log('Manual garbage collection available');
      
      // Set up periodic GC for long-running processes
      setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const rssMB = memUsage.rss / 1024 / 1024;
        
        // Force GC if memory usage is high
        if (heapUsedMB > 1536 || rssMB > 2048) { // 1.5GB heap or 2GB RSS
          console.log(`High memory usage detected (heap: ${heapUsedMB.toFixed(1)}MB, rss: ${rssMB.toFixed(1)}MB), forcing GC`);
          global.gc();
        }
      }, 30000); // Check every 30 seconds
    } else {
      console.log('Manual garbage collection not available. Run with --expose-gc for better memory management.');
    }
    
    // Configure process memory warnings
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning') {
        console.warn('Memory warning:', warning.message);
      }
    });
    
    // Log initial memory usage
    const initialMemory = process.memoryUsage();
    console.log('Initial memory usage:');
    console.log(`- Heap used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    console.log(`- Heap total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(1)}MB`);
    console.log(`- RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(1)}MB`);
    console.log(`- External: ${(initialMemory.external / 1024 / 1024).toFixed(1)}MB`);
    
    console.log('Memory optimization settings configured successfully');
    
  } catch (error) {
    console.error('Failed to configure memory optimization settings:', error);
    // Don't throw error to prevent app startup failure
  }
}

// Monitor memory usage and provide warnings
export function startMemoryMonitoring(): void {
  console.log('Starting memory monitoring...');
  
  const monitorInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;
    const heapPercentage = (heapUsedMB / heapTotalMB) * 100;
    
    // Log memory usage every 5 minutes in production
    if (process.env.NODE_ENV === 'production') {
      console.log(`Memory usage: heap ${heapUsedMB.toFixed(1)}MB (${heapPercentage.toFixed(1)}%), RSS ${rssMB.toFixed(1)}MB, external ${externalMB.toFixed(1)}MB`);
    }
    
    // Warnings for high memory usage
    if (heapPercentage > 85) {
      console.warn(`⚠️ High heap usage: ${heapPercentage.toFixed(1)}% (${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB)`);
    }
    
    if (rssMB > 3072) { // 3GB RSS warning
      console.warn(`⚠️ High RSS usage: ${rssMB.toFixed(1)}MB`);
    }
    
    if (externalMB > 512) { // 512MB external memory warning
      console.warn(`⚠️ High external memory usage: ${externalMB.toFixed(1)}MB`);
    }
    
  }, process.env.NODE_ENV === 'production' ? 300000 : 60000); // 5 min in prod, 1 min in dev
  
  // Cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(monitorInterval);
  });
  
  process.on('SIGINT', () => {
    clearInterval(monitorInterval);
  });
}

// Emergency memory cleanup function
export function emergencyMemoryCleanup(): void {
  console.log('Performing emergency memory cleanup...');
  
  try {
    // Force multiple garbage collection cycles
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
      }
      console.log('Forced garbage collection completed');
    }
    
    // Clear any Sharp cache (even though we disabled it)
    try {
      sharp.cache(false);
    } catch (error) {
      // Ignore errors
    }
    
    // Log memory usage after cleanup
    const memUsage = process.memoryUsage();
    console.log(`Memory after cleanup: heap ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB, RSS ${(memUsage.rss / 1024 / 1024).toFixed(1)}MB`);
    
  } catch (error) {
    console.error('Emergency memory cleanup failed:', error);
  }
}

// Check if memory settings are optimal for image processing
export function validateMemoryConfiguration(): boolean {
  console.log('Validating memory configuration...');
  
  const nodeOptions = process.env.NODE_OPTIONS || '';
  const warnings = [];
  const recommendations = [];
  
  // Check Node.js heap size
  if (!nodeOptions.includes('--max-old-space-size')) {
    warnings.push('NODE_OPTIONS does not include --max-old-space-size');
    recommendations.push('Set NODE_OPTIONS="--max-old-space-size=3072" for 3GB heap');
  }
  
  // Check if garbage collection is exposed
  if (!global.gc) {
    warnings.push('Manual garbage collection not available');
    recommendations.push('Add --expose-gc to NODE_OPTIONS for better memory management');
  }
  
  // Check available memory
  const totalMemory = process.memoryUsage().heapTotal / 1024 / 1024;
  if (totalMemory < 1024) { // Less than 1GB
    warnings.push(`Low heap memory available: ${totalMemory.toFixed(1)}MB`);
    recommendations.push('Increase heap size with --max-old-space-size for image processing');
  }
  
  if (warnings.length > 0) {
    console.warn('Memory configuration warnings:');
    warnings.forEach(warning => console.warn(`- ${warning}`));
    
    console.log('Recommendations:');
    recommendations.forEach(rec => console.log(`- ${rec}`));
    
    return false;
  }
  
  console.log('Memory configuration is optimal for image processing');
  return true;
}

// Get memory usage statistics
export function getMemoryStats(): {
  heap: { used: number; total: number; percentage: number };
  rss: number;
  external: number;
  arrayBuffers: number;
} {
  const memUsage = process.memoryUsage();
  
  return {
    heap: {
      used: memUsage.heapUsed / 1024 / 1024, // MB
      total: memUsage.heapTotal / 1024 / 1024, // MB
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    },
    rss: memUsage.rss / 1024 / 1024, // MB
    external: memUsage.external / 1024 / 1024, // MB
    arrayBuffers: memUsage.arrayBuffers / 1024 / 1024, // MB
  };
}
