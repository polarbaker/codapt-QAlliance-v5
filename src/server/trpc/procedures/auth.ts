import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { adminLoginSchema } from "~/constants/validation";
import * as z from "zod";
import jwt from "jsonwebtoken";

export const adminLogin = baseProcedure
  .input(adminLoginSchema)
  .mutation(async ({ input }) => {
    try {
      const { password } = input;
      
      console.log('Admin login attempt');
      
      // Compare the input password directly with the admin password from environment
      const isValidPassword = password === env.ADMIN_PASSWORD;
      
      if (!isValidPassword) {
        console.error('Admin login failed: Invalid password');
        throw new Error('Invalid password');
      }
      
      // Generate JWT token with more explicit configuration
      const payload = { 
        isAdmin: true,
        iat: Math.floor(Date.now() / 1000),
        // Add a unique identifier for this session
        sessionId: Math.random().toString(36).substring(2, 15),
      };
      
      const token = jwt.sign(
        payload,
        env.JWT_SECRET,
        { 
          expiresIn: '24h',
          issuer: 'quantum-alliance-admin',
          algorithm: 'HS256' // Explicitly specify algorithm
        }
      );
      
      console.log('Admin login successful, token generated');
      
      return {
        success: true,
        token,
        message: 'Admin login successful',
      };
    } catch (error) {
      console.error('Admin login error:', error);
      throw new Error('Invalid credentials');
    }
  });

export const verifyAdminToken = baseProcedure
  .input(z.object({
    token: z.string().min(1, "Token is required"),
  }))
  .query(async ({ input }) => {
    try {
      const { token } = input;
      
      console.log('Verifying admin token via query...');
      
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'], // Explicitly specify allowed algorithms
        issuer: 'quantum-alliance-admin'
      }) as any;
      
      if (!decoded.isAdmin) {
        console.error('Token verification failed: Not an admin token');
        throw new Error('Invalid admin token');
      }
      
      console.log('Token verification successful');
      
      return {
        valid: true,
        isAdmin: decoded.isAdmin,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        valid: false,
        isAdmin: false,
        error: error instanceof Error ? error.message : 'Token verification failed',
      };
    }
  });

export const requireAdminAuth = async (token: string | undefined) => {
  if (!token) {
    console.error('Admin auth failed: No token provided');
    throw new Error('Admin authentication required');
  }
  
  try {
    // Add more detailed logging for debugging
    console.log('Verifying admin token...');
    
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    
    // Add more validation
    if (!decoded) {
      console.error('Admin auth failed: Token verification returned null/undefined');
      throw new Error('Invalid token format');
    }
    
    if (!decoded.isAdmin) {
      console.error('Admin auth failed: Token does not have admin privileges', { decoded });
      throw new Error('Admin privileges required');
    }
    
    // Check if token is expired (additional check)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.error('Admin auth failed: Token is expired', { exp: decoded.exp, now });
      throw new Error('Token has expired');
    }
    
    console.log('Admin token verified successfully', { isAdmin: decoded.isAdmin, iat: decoded.iat });
    return decoded;
  } catch (error) {
    // Enhanced error logging
    if (error instanceof jwt.JsonWebTokenError) {
      console.error('JWT Error:', error.message, { tokenLength: token?.length });
      if (error.message.includes('invalid signature')) {
        throw new Error('Invalid token signature - please log in again');
      } else if (error.message.includes('jwt expired')) {
        throw new Error('Token has expired - please log in again');
      } else if (error.message.includes('jwt malformed')) {
        throw new Error('Malformed token - please log in again');
      }
    } else {
      console.error('Admin auth error:', error);
    }
    
    throw new Error('Invalid or expired admin token');
  }
};
