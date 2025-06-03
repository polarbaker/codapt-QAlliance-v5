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
      
      // Compare the input password directly with the admin password from environment
      // Since ADMIN_PASSWORD is stored as plain text in environment
      const isValidPassword = password === env.ADMIN_PASSWORD;
      
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          isAdmin: true,
          iat: Math.floor(Date.now() / 1000),
        },
        env.JWT_SECRET,
        { 
          expiresIn: '24h',
          issuer: 'quantum-alliance-admin'
        }
      );
      
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
      
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      
      if (!decoded.isAdmin) {
        throw new Error('Invalid admin token');
      }
      
      return {
        valid: true,
        isAdmin: decoded.isAdmin,
        iat: decoded.iat,
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        valid: false,
        isAdmin: false,
      };
    }
  });

export const requireAdminAuth = async (token: string | undefined) => {
  if (!token) {
    throw new Error('Admin authentication required');
  }
  
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    
    if (!decoded.isAdmin) {
      throw new Error('Admin privileges required');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired admin token');
  }
};
