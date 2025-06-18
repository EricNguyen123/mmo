/* eslint-disable @typescript-eslint/no-explicit-any */
export interface UserKeyAssignment {
  _id?: string;
  userId: string;
  keyId: string;
  assignedAt: Date;
  assignedBy: string; // Admin who assigned the key
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expiresAt?: Date;
  notes?: string;
  metadata?: {
    department?: string;
    project?: string;
    purpose?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export interface UserWithKeys {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  assignedKeys: Array<{
    keyId: string;
    key: string;
    assignedAt: Date;
    status: string;
    expiresAt?: Date;
    deviceLimit: number;
    usedDevices: number;
    isActive: boolean;
  }>;
  totalKeys: number;
  activeKeys: number;
}

export interface KeyWithUser {
  _id: string;
  key: string;
  deviceLimit: number;
  usedDevices: number;
  isActive: boolean;
  createdAt: Date;
  assignedUser?: {
    userId: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    assignedAt: Date;
    status: string;
    expiresAt?: Date;
    notes?: string;
    metadata?: any;
  };
  isAssigned: boolean;
}

export interface AssignKeyRequest {
  userId: string;
  keyId: string;
  expiresAt?: Date;
  notes?: string;
  metadata?: {
    department?: string;
    project?: string;
    purpose?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}
