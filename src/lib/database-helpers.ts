import { ObjectId } from 'mongodb';
import {
  getUsersCollection,
  getActivationKeysCollection,
  getUserKeyAssignmentsCollection,
  getCredentialsCollection,
} from './mongodb';

// User helpers
export async function findUserById(id: string) {
  const users = await getUsersCollection();
  return users.findOne({ _id: new ObjectId(id) });
}

export async function findUserByUsername(username: string) {
  const users = await getUsersCollection();
  return users.findOne({ username });
}

export async function findUserByEmail(email: string) {
  const users = await getUsersCollection();
  return users.findOne({ email });
}

// Key helpers
export async function findKeyById(id: string) {
  const keys = await getActivationKeysCollection();
  return keys.findOne({ _id: new ObjectId(id) });
}

export async function findKeyByValue(key: string) {
  const keys = await getActivationKeysCollection();
  return keys.findOne({ key });
}

// Assignment helpers
export async function findUserAssignments(userId: string) {
  const assignments = await getUserKeyAssignmentsCollection();
  return assignments.find({ userId }).toArray();
}

export async function findKeyAssignment(keyId: string) {
  const assignments = await getUserKeyAssignmentsCollection();
  return assignments.findOne({ keyId: new ObjectId(keyId) });
}

export async function findActiveAssignment(userId: string, keyId: string) {
  const assignments = await getUserKeyAssignmentsCollection();
  return assignments.findOne({
    userId,
    keyId: new ObjectId(keyId),
    status: 'ACTIVE',
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  });
}

// Credential helpers
export async function findUserCredentials(userId: string) {
  const credentials = await getCredentialsCollection();
  return credentials.find({ userId }).sort({ createdAt: -1 }).toArray();
}

export async function countUserCredentials(userId: string) {
  const credentials = await getCredentialsCollection();
  return credentials.countDocuments({ userId });
}

// Utility functions
export function createObjectId(id?: string) {
  return id ? new ObjectId(id) : new ObjectId();
}

export function isValidObjectId(id: string) {
  return ObjectId.isValid(id);
}
