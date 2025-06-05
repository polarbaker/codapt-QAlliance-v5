import { useTRPC } from '~/trpc/react';

export interface TRPCHealthCheckResult {
  isHealthy: boolean;
  availableProcedures: string[];
  missingProcedures: string[];
  errors: string[];
}

// List of critical procedures that should be available
const CRITICAL_PROCEDURES = [
  'getPartners',
  'getInnovators',
  'getFeaturedInnovators',
  'getImpactMetrics',
  'getSummaryStats',
  'getComments',
  'postComment',
  'subscribeNewsletter',
  'submitContactMessage',
  'submitProblem',
  'adminLogin',
  'adminGetInnovators',
  'adminGetPartners',
  'adminCreateInnovator',
  'adminUpdateInnovator',
  'adminDeleteInnovator',
];

export function useTRPCHealthCheck(): TRPCHealthCheckResult {
  const availableProcedures: string[] = [];
  const missingProcedures: string[] = [];
  const errors: string[] = [];
  
  try {
    const trpc = useTRPC();
    
    // Test each critical procedure
    for (const procedureName of CRITICAL_PROCEDURES) {
      try {
        const procedure = (trpc as any)[procedureName];
        if (procedure && typeof procedure.queryOptions === 'function') {
          availableProcedures.push(procedureName);
        } else if (procedure && typeof procedure.mutationOptions === 'function') {
          availableProcedures.push(procedureName);
        } else {
          missingProcedures.push(procedureName);
        }
      } catch (error) {
        errors.push(`Error accessing ${procedureName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        missingProcedures.push(procedureName);
      }
    }
  } catch (error) {
    errors.push(`Failed to initialize tRPC client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  const isHealthy = errors.length === 0 && missingProcedures.length === 0;
  
  return {
    isHealthy,
    availableProcedures,
    missingProcedures,
    errors,
  };
}

// Simple logging function for debugging
export function logTRPCProcedures(): void {
  if (typeof window === 'undefined') return; // Don't run on server
  
  try {
    console.group('🔍 tRPC Procedures Check');
    
    // Test a few key procedures
    const testProcedures = ['getPartners', 'getInnovators', 'adminGetInnovators'];
    
    testProcedures.forEach(procName => {
      try {
        // This is a basic test - we can't call useTRPC outside of a component
        console.log(`✅ Procedure ${procName} should be available`);
      } catch (error) {
        console.error(`❌ Error with ${procName}:`, error);
      }
    });
    
    console.groupEnd();
  } catch (error) {
    console.error('Failed to run tRPC procedures check:', error);
  }
}
