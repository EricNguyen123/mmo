export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  platform?: string;
}

export interface RegisteredDevice {
  deviceId: string;
  userId: string;
  registeredAt: Date;
  deviceInfo?: DeviceInfo;
  lastActiveAt?: Date;
  isActive?: boolean;
}

export interface KeyMetadata {
  tags?: string[];
  department?: string;
  project?: string;
}

export interface ActivationKey {
  _id?: string;
  key: string;
  deviceLimit: number;
  usedDevices: number;
  createdAt: Date;
  updatedAt?: Date;
  isActive: boolean;
  expiresAt?: Date;
  description?: string;
  createdBy?: string;
  devices: RegisteredDevice[];
  metadata?: KeyMetadata;
}

export interface CreateKeyRequest {
  deviceLimit: number;
  description?: string;
  expiresAt?: Date;
  metadata?: KeyMetadata;
}

export interface UpdateKeyRequest {
  isActive?: boolean;
  deviceLimit?: number;
  description?: string;
  expiresAt?: Date;
  metadata?: KeyMetadata;
}
