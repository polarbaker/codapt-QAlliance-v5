import sharp from 'sharp';

// Enhanced memory optimization configuration for production image processing
export function optimizeMemorySettings(): void {
  console.log('Configuring enhanced memory optimization settings...');
  
  try {
    // Get memory limits from environment or use defaults
    const maxMemoryMB = parseInt(process.env.IMAGE_PROCESSING_MEMORY_LIMIT || '2048');
    const concurrency = parseInt(process.env.SHARP_CONCURRENCY || '2');
    const cacheSize = parseInt(process.env.SHARP_CACHE_SIZE || '50');
    
    // Configure Sharp for production efficiency with better performance
    sharp.cache({ 
      memory: cacheSize, // Small cache for frequently used operations
      files: 0, // Disable file cache
      items: 100 // Limit cached items
    });
    sharp.concurrency(concurrency); // Allow multiple threads for better performance
    sharp.simd(false); // Keep disabled for memory predictability
    
    console.log('Enhanced Sharp configuration applied:');
    console.log(`- Cache: ${cacheSize}MB memory, 0 files, 100 items`);
    console.log(`- Concurrency: ${concurrency} threads`);
    console.log('- SIMD: disabled for memory predictability');
    console.log(`- Memory limit: ${maxMemoryMB}MB`);
    
    // Enhanced garbage collection configuration
    if (global.gc) {
      console.log('Manual garbage collection available - configuring enhanced monitoring');
      
      // More sophisticated GC strategy
      const gcInterval = setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const rssMB = memUsage.rss / 1024 / 1024;
        const externalMB = memUsage.external / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const heapPercentage = (heapUsedMB / heapTotalMB) * 100;
        
        // Multi-tier memory management
        if (heapPercentage > 90 || rssMB > maxMemoryMB * 0.9 || externalMB > 1024) {
          console.log(`Critical memory usage detected - forcing aggressive GC (heap: ${heapUsedMB.toFixed(1)}MB/${heapTotalMB.toFixed(1)}MB, rss: ${rssMB.toFixed(1)}MB, external: ${externalMB.toFixed(1)}MB)`);
          // Multiple GC cycles for critical situations
          for (let i = 0; i < 3; i++) {
            global.gc();
          }
          // Clear Sharp cache on critical memory situations
          sharp.cache(false);
          setTimeout(() => {
            sharp.cache({ memory: cacheSize, files: 0, items: 100 });
          }, 1000);
        } else if (heapPercentage > 75 || rssMB > maxMemoryMB * 0.75) {
          console.log(`High memory usage detected - forcing standard GC (heap: ${heapPercentage.toFixed(1)}%, rss: ${rssMB.toFixed(1)}MB)`);
          global.gc();
        } else if (heapPercentage > 60 || rssMB > maxMemoryMB * 0.6) {
          // Preventive GC for sustained performance
          global.gc();
        }
      }, parseInt(process.env.MEMORY_CHECK_INTERVAL || '30000'));
      
      // Cleanup on process exit
      process.on('SIGTERM', () => clearInterval(gcInterval));
      process.on('SIGINT', () => clearInterval(gcInterval));
      
    } else {
      console.log('Manual garbage collection not available. For optimal performance, run with --expose-gc');
    }
    
    console.log('Enhanced memory optimization configured successfully');
    
  } catch (error) {
    console.error('Failed to configure enhanced memory optimization:', error);
    // Fallback to basic configuration
    try {
      sharp.cache(false);
      sharp.concurrency(1);
      sharp.simd(false);
      console.log('Fallback to basic memory configuration applied');
    } catch (fallbackError) {
      console.error('Failed to apply fallback configuration:', fallbackError);
    }
  }
}

// Enhanced memory monitoring with detailed metrics and alerting
export function startMemoryMonitoring(): void {
  console.log('Starting enhanced memory monitoring...');
  
  const maxMemoryMB = parseInt(process.env.IMAGE_PROCESSING_MEMORY_LIMIT || '2048');
  const enableMonitoring = process.env.ENABLE_MEMORY_MONITORING !== 'false'; // Default to enabled
  
  if (!enableMonitoring) {
    console.log('Memory monitoring disabled via environment variable');
    return;
  }
  
  let alertCount = 0;
  let lastAlertTime = 0;
  
  const monitorInterval = setInterval(() => {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const rssMB = memUsage.rss / 1024 / 1024;
      const externalMB = memUsage.external / 1024 / 1024;
      const arrayBuffersMB = memUsage.arrayBuffers / 1024 / 1024;
      const heapPercentage = (heapUsedMB / heapTotalMB) * 100;
      
      // Enhanced logging with structured data
      const memoryStats = {
        timestamp: new Date().toISOString(),
        heap: { used: heapUsedMB, total: heapTotalMB, percentage: heapPercentage },
        rss: rssMB,
        external: externalMB,
        arrayBuffers: arrayBuffersMB,
        limit: maxMemoryMB,
        status: 'normal' as 'normal' | 'elevated' | 'high' | 'critical'
      };
      
      if (heapPercentage > 90 || rssMB > maxMemoryMB * 0.9) {
        memoryStats.status = 'critical';
        console.error('🚨 CRITICAL MEMORY USAGE:', JSON.stringify(memoryStats));
      } else if (heapPercentage > 75 || rssMB > maxMemoryMB * 0.75) {
        memoryStats.status = 'high';
        console.warn('⚠️ HIGH MEMORY USAGE:', JSON.stringify(memoryStats));
      } else if (heapPercentage > 60 || rssMB > maxMemoryMB * 0.6) {
        memoryStats.status = 'elevated';
        if (process.env.ENABLE_DETAILED_LOGGING === 'true') {
          console.log('📊 ELEVATED MEMORY USAGE:', JSON.stringify(memoryStats));
        }
      } else if (process.env.ENABLE_DETAILED_LOGGING === 'true') {
        console.log('📊 Memory stats:', JSON.stringify(memoryStats));
      }
      
      // Enhanced alerting with rate limiting
      const now = Date.now();
      if ((heapPercentage > 85 || rssMB > maxMemoryMB * 0.85) && (now - lastAlertTime > 60000)) {
        alertCount++;
        lastAlertTime = now;
        
        console.error(`🚨 Memory Alert #${alertCount}: heap ${heapPercentage.toFixed(1)}% (${heapUsedMB.toFixed(1)}MB), RSS ${rssMB.toFixed(1)}MB, limit ${maxMemoryMB}MB`);
        
        // Suggest actions based on memory usage patterns
        if (externalMB > 512) {
          console.warn('💡 High external memory detected - consider reducing image batch sizes');
        }
        if (arrayBuffersMB > 256) {
          console.warn('💡 High ArrayBuffer usage detected - image processing may be accumulating');
        }
        if (alertCount > 5) {
          console.error('💡 Frequent memory alerts detected - consider increasing memory limits or reducing concurrent operations');
        }
      }
      
      // Reset alert count periodically
      if (now - lastAlertTime > 300000) { // 5 minutes
        alertCount = 0;
      }
    } catch (error) {
      console.error('Error in memory monitoring:', error);
    }
    
  }, parseInt(process.env.MEMORY_CHECK_INTERVAL || '30000'));
  
  // Enhanced cleanup on process exit
  const cleanup = () => {
    console.log('Stopping memory monitoring...');
    clearInterval(monitorInterval);
    
    try {
      // Final memory report
      const finalMemory = process.memoryUsage();
      console.log('Final memory usage:', {
        heap: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        rss: `${(finalMemory.rss / 1024 / 1024).toFixed(1)}MB`,
        external: `${(finalMemory.external / 1024 / 1024).toFixed(1)}MB`,
        alerts: alertCount
      });
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  };
  
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('exit', cleanup);
}

// Enhanced emergency memory cleanup with proper error handling
export async function emergencyMemoryCleanup(reason?: string): Promise<void> {
  console.log(`Performing emergency memory cleanup${reason ? ` (${reason})` : ''}...`);
  
  const beforeMemory = process.memoryUsage();
  
  try {
    // Clear Sharp cache completely
    sharp.cache(false);
    
    // Force multiple garbage collection cycles with proper delays
    if (global.gc) {
      for (let i = 0; i < 5; i++) {
        global.gc();
        // Add delay between GC cycles
        if (i < 4) {
          await new Promise<void>(resolve => setTimeout(resolve, 100));
        }
      }
      console.log('Completed 5 aggressive garbage collection cycles');
    }
    
    // Additional cleanup cycles
    if (global.gc) {
      for (let i = 0; i < 2; i++) {
        global.gc();
        await new Promise<void>(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Restore Sharp cache with minimal settings
    await new Promise<void>(resolve => {
      setTimeout(() => {
        try {
          sharp.cache({ memory: 25, files: 0, items: 50 });
          console.log('Sharp cache restored with minimal settings');
        } catch (error) {
          console.warn('Failed to restore Sharp cache:', error);
        }
        resolve();
      }, 2000);
    });
    
    // Log cleanup results
    const afterMemory = process.memoryUsage();
    const heapReduction = (beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024;
    const rssReduction = (beforeMemory.rss - afterMemory.rss) / 1024 / 1024;
    
    console.log('Emergency cleanup completed:', {
      heapReduction: `${heapReduction.toFixed(1)}MB`,
      rssReduction: `${rssReduction.toFixed(1)}MB`,
      finalHeap: `${(afterMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`,
      finalRSS: `${(afterMemory.rss / 1024 / 1024).toFixed(1)}MB`
    });
    
  } catch (error) {
    console.error('Emergency memory cleanup failed:', error);
  }
}

// Enhanced memory configuration validation
export function validateMemoryConfiguration(): boolean {
  console.log('Validating enhanced memory configuration...');
  
  const nodeOptions = process.env.NODE_OPTIONS || '';
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  try {
    // Check Node.js heap size
    const heapSizeMatch = nodeOptions.match(/--max-old-space-size=(\d+)/);
    const heapSize = heapSizeMatch ? parseInt(heapSizeMatch[1]) : 0;
    
    if (heapSize < 3072) {
      warnings.push(`Low heap size: ${heapSize}MB (recommended: 4096MB+)`);
      recommendations.push('Set NODE_OPTIONS="--max-old-space-size=4096" for optimal image processing');
      score -= 20;
    }
    
    // Check if garbage collection is exposed
    if (!global.gc) {
      warnings.push('Manual garbage collection not available');
      recommendations.push('Add --expose-gc to NODE_OPTIONS for enhanced memory management');
      score -= 15;
    }
    
    // Check available memory
    const totalMemory = process.memoryUsage().heapTotal / 1024 / 1024;
    if (totalMemory < 2048) {
      warnings.push(`Low heap memory available: ${totalMemory.toFixed(1)}MB`);
      recommendations.push('Increase heap size for robust image processing');
      score -= 25;
    }
    
    // Check Sharp configuration
    try {
      const sharpStats = sharp.cache();
      if (!sharpStats || sharpStats.memory === undefined) {
        warnings.push('Sharp cache configuration not optimal');
        recommendations.push('Configure Sharp cache for better performance');
        score -= 10;
      }
    } catch (error) {
      warnings.push('Unable to verify Sharp configuration');
      score -= 5;
    }
    
    // Check environment variables
    if (!process.env.IMAGE_PROCESSING_MEMORY_LIMIT) {
      warnings.push('IMAGE_PROCESSING_MEMORY_LIMIT not set');
      recommendations.push('Set IMAGE_PROCESSING_MEMORY_LIMIT for memory monitoring');
      score -= 5;
    }
    
    if (!process.env.SHARP_CONCURRENCY) {
      warnings.push('SHARP_CONCURRENCY not configured');
      recommendations.push('Set SHARP_CONCURRENCY=2 for optimal performance');
      score -= 5;
    }
    
    // Check UV_THREADPOOL_SIZE
    const threadPoolSize = parseInt(process.env.UV_THREADPOOL_SIZE || '4');
    if (threadPoolSize < 8) {
      warnings.push(`Low UV_THREADPOOL_SIZE: ${threadPoolSize} (recommended: 8+)`);
      recommendations.push('Set UV_THREADPOOL_SIZE=8 for better I/O performance');
      score -= 10;
    }
    
    // Report results
    console.log(`Memory configuration score: ${score}/100`);
    
    if (warnings.length > 0) {
      console.warn('Memory configuration warnings:');
      warnings.forEach(warning => console.warn(`- ${warning}`));
      
      console.log('Recommendations for optimal performance:');
      recommendations.forEach(rec => console.log(`- ${rec}`));
    }
    
    if (score >= 80) {
      console.log('✅ Memory configuration is good for image processing');
      return true;
    } else if (score >= 60) {
      console.log('⚠️ Memory configuration is acceptable but could be improved');
      return true;
    } else {
      console.log('❌ Memory configuration needs improvement for reliable image processing');
      return false;
    }
  } catch (error) {
    console.error('Error validating memory configuration:', error);
    return false;
  }
}

// Enhanced memory statistics
export function getMemoryStats(): {
  heap: { used: number; total: number; percentage: number };
  rss: number;
  external: number;
  arrayBuffers: number;
  system: {
    limit: number;
    available: number;
    pressure: 'low' | 'medium' | 'high' | 'critical';
  };
  sharp?: {
    cache: any;
    concurrency: number;
  };
} {
  const memUsage = process.memoryUsage();
  const maxMemoryMB = parseInt(process.env.IMAGE_PROCESSING_MEMORY_LIMIT || '2048');
  const rssMB = memUsage.rss / 1024 / 1024;
  const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  // Determine memory pressure
  let pressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (heapPercentage > 90 || rssMB > maxMemoryMB * 0.9) {
    pressure = 'critical';
  } else if (heapPercentage > 75 || rssMB > maxMemoryMB * 0.75) {
    pressure = 'high';
  } else if (heapPercentage > 60 || rssMB > maxMemoryMB * 0.6) {
    pressure = 'medium';
  }
  
  const stats = {
    heap: {
      used: memUsage.heapUsed / 1024 / 1024,
      total: memUsage.heapTotal / 1024 / 1024,
      percentage: heapPercentage,
    },
    rss: rssMB,
    external: memUsage.external / 1024 / 1024,
    arrayBuffers: memUsage.arrayBuffers / 1024 / 1024,
    system: {
      limit: maxMemoryMB,
      available: Math.max(0, maxMemoryMB - rssMB),
      pressure,
    },
  };
  
  // Add Sharp statistics if available
  try {
    const sharpCache = sharp.cache();
    (stats as any).sharp = {
      cache: sharpCache,
      concurrency: parseInt(process.env.SHARP_CONCURRENCY || '2'),
    };
  } catch (error) {
    // Sharp stats not available
  }
  
  return stats;
}

// Memory pressure detection
export function isMemoryUnderPressure(): boolean {
  const stats = getMemoryStats();
  return stats.system.pressure === 'high' || stats.system.pressure === 'critical';
}

// Memory optimization suggestions
export function getMemoryOptimizationSuggestions(): string[] {
  const stats = getMemoryStats();
  const suggestions: string[] = [];
  
  if (stats.heap.percentage > 85) {
    suggestions.push('Heap usage is very high - consider reducing concurrent operations');
  }
  
  if (stats.external > 512) {
    suggestions.push('High external memory usage - reduce image batch sizes');
  }
  
  if (stats.arrayBuffers > 256) {
    suggestions.push('High ArrayBuffer usage - image processing may be accumulating');
  }
  
  if (stats.rss > stats.system.limit * 0.9) {
    suggestions.push('RSS approaching limit - increase memory allocation or reduce load');
  }
  
  if (stats.system.pressure === 'critical') {
    suggestions.push('Critical memory pressure - consider emergency cleanup');
  }
  
  return suggestions;
}

// Async memory check
export async function performAsyncMemoryCheck(): Promise<{
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  stats: ReturnType<typeof getMemoryStats>;
}> {
  const stats = getMemoryStats();
  
  let recommendedAction = 'none';
  
  if (stats.system.pressure === 'critical') {
    recommendedAction = 'emergency_cleanup';
  } else if (stats.system.pressure === 'high') {
    recommendedAction = 'standard_gc';
  } else if (stats.system.pressure === 'medium') {
    recommendedAction = 'preventive_gc';
  }
  
  // Brief async operation for consistency
  await new Promise<void>(resolve => setTimeout(resolve, 10));
  
  return {
    memoryPressure: stats.system.pressure,
    recommendedAction,
    stats
  };
}

// Initialize memory optimization
export async function initializeMemoryOptimization(): Promise<boolean> {
  console.log('Initializing enhanced memory optimization...');
  
  try {
    // Configure Sharp
    optimizeMemorySettings();
    
    // Start monitoring
    startMemoryMonitoring();
    
    // Validate configuration
    const configValid = await new Promise<boolean>(resolve => {
      setTimeout(() => {
        resolve(validateMemoryConfiguration());
      }, 100);
    });
    
    if (!configValid) {
      console.warn('⚠️ Memory configuration validation failed');
      return false;
    }
    
    console.log('✅ Memory optimization initialized successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize memory optimization:', error);
    return false;
  }
}
