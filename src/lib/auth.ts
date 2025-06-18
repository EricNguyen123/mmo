/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from './mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  profileImage?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthResult> {
  try {
    const { db } = await connectToDatabase();

    // Find user by username or email
    const user = await db.collection('users').findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated' };
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    const userObj: User = {
      _id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: new Date(),
      profileImage: user.profileImage,
    };

    const token = generateToken(userObj);

    return {
      success: true,
      user: userObj,
      token,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

export async function registerUser(userData: {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<AuthResult> {
  try {
    const { db } = await connectToDatabase();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({
      $or: [{ username: userData.username }, { email: userData.email }],
    });

    if (existingUser) {
      return {
        success: false,
        error:
          existingUser.username === userData.username
            ? 'Username already exists'
            : 'Email already exists',
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create user
    const newUser = {
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: 'USER' as const,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        theme: 'light',
        notifications: true,
      },
    };

    const result = await db.collection('users').insertOne(newUser);

    const token = generateToken({
      _id: result.insertedId.toString(),
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
    });

    return {
      success: true,
      user: {
        _id: result.insertedId.toString(),
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
      token,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
}
