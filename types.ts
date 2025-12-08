export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'BLOCKED';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In a real app, this would be hashed.
  phone: string;
  role: UserRole;
  status: UserStatus;
  // Company Details for Reports
  companyName?: string;
  companyAddress?: string;
  companyCnpj?: string;
}

export interface Client {
  id: string;
  ownerId: string; // Link to the user who owns this client
  name: string;
  email: string;
  phone: string;
  category: string;
  createdAt: string;
  address?: string;
  contactPerson?: string;
  cnpj?: string;
}

export type PaymentMethod = 'PIX' | 'CASH' | 'CARD';
// REMOVIDO: export type ServiceStatus ...

export interface ServiceRecord {
  id: string;
  ownerId: string; // Link to the user who owns this service
  clientId: string;
  pickupAddresses: string[]; 
  deliveryAddresses: string[]; 
  cost: number; 
  driverFee: number; 
  requesterName: string;
  date: string;
  notes?: string;
  imageUrl?: string;
  paid: boolean; 
  paymentMethod?: PaymentMethod;
  // REMOVIDO: status: ServiceStatus;
}

export type ExpenseCategory = 'GAS' | 'LUNCH' | 'OTHER';

export interface ExpenseRecord {
  id: string;
  ownerId: string; // Link to the user who owns this expense
  category: ExpenseCategory;
  amount: number;
  date: string;
  description?: string;
}

export enum AppView {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  CLIENTS = 'CLIENTS',
  CLIENT_DETAILS = 'CLIENT_DETAILS',
  EXPENSES = 'EXPENSES',
  REPORTS = 'REPORTS',
  NEW_ORDER = 'NEW_ORDER',
  ADMIN_PANEL = 'ADMIN_PANEL',
  SETTINGS = 'SETTINGS', 
}

export interface NavState {
  view: AppView;
  clientId?: string;
}

// --- DATABASE INTEGRATION TYPES ---

export type DbProvider = 'FIREBASE' | 'SUPABASE' | 'MONGODB' | 'WEBHOOK' | 'GOOGLE_DRIVE';

export interface DatabaseConnection {
  id: string;
  provider: DbProvider;
  name: string;
  isActive: boolean;
  endpointUrl: string;
  apiKey?: string; // Authorization header or query param
  lastBackupStatus: 'SUCCESS' | 'ERROR' | 'PENDING' | 'NEVER';
  lastBackupTime?: string;
}
