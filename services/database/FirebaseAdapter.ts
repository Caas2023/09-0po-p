import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'; // Importado Auth
import { DatabaseAdapter } from './types';
import { Client, ServiceRecord, ExpenseRecord, User } from '../../types';

export class FirebaseAdapter implements DatabaseAdapter {
    private db: any;
    private auth: any;

    constructor(config: any) {
        const app = initializeApp(config);
        this.db = getFirestore(app);
        this.auth = getAuth(app);
    }

    async initialize() {
        console.log('Firebase initialized');
    }

    // --- Users ---
    async getUsers(): Promise<User[]> {
        const q = query(collection(this.db, 'users'));
        const querySnapshot = await getDocs(q);
        const users: User[] = [];
        querySnapshot.forEach((doc) => {
            users.push(doc.data() as User);
        });
        return users;
    }
    async saveUser(user: User): Promise<void> {
        await setDoc(doc(this.db, 'users', user.id), user);
    }
    async updateUser(user: User): Promise<void> {
        await updateDoc(doc(this.db, 'users', user.id), { ...user });
    }
    async deleteUser(id: string): Promise<void> {
        await deleteDoc(doc(this.db, 'users', id));
    }

    // --- Clients ---
    async getClients(ownerId: string): Promise<Client[]> {
        const q = query(collection(this.db, 'clients'), where('ownerId', '==', ownerId));
        const querySnapshot = await getDocs(q);
        const list: Client[] = [];
        querySnapshot.forEach((doc) => list.push(doc.data() as Client));
        return list;
    }
    async saveClient(client: Client): Promise<void> {
        await setDoc(doc(this.db, 'clients', client.id), client);
    }
    async deleteClient(id: string): Promise<void> {
        await deleteDoc(doc(this.db, 'clients', id));
    }

    // --- Services ---
    async getServices(ownerId: string): Promise<ServiceRecord[]> {
        const q = query(collection(this.db, 'services'), where('ownerId', '==', ownerId));
        const querySnapshot = await getDocs(q);
        const list: ServiceRecord[] = [];
        querySnapshot.forEach((doc) => list.push(doc.data() as ServiceRecord));
        return list;
    }
    async saveService(service: ServiceRecord): Promise<void> {
        await setDoc(doc(this.db, 'services', service.id), service);
    }
    async updateService(service: ServiceRecord): Promise<void> {
        await updateDoc(doc(this.db, 'services', service.id), { ...service });
    }
    async deleteService(id: string): Promise<void> {
        await deleteDoc(doc(this.db, 'services', id));
    }

    // --- Expenses ---
    async getExpenses(ownerId: string): Promise<ExpenseRecord[]> {
        const q = query(collection(this.db, 'expenses'), where('ownerId', '==', ownerId));
        const querySnapshot = await getDocs(q);
        const list: ExpenseRecord[] = [];
        querySnapshot.forEach((doc) => list.push(doc.data() as ExpenseRecord));
        return list;
    }
    async saveExpense(expense: ExpenseRecord): Promise<void> {
        await setDoc(doc(this.db, 'expenses', expense.id), expense);
    }
    async deleteExpense(id: string): Promise<void> {
        await deleteDoc(doc(this.db, 'expenses', id));
    }

    // --- PASSWORD RESET (Firebase usa Links, não Códigos) ---
    async requestPasswordReset(email: string): Promise<{ success: boolean; message?: string }> {
        try {
            await sendPasswordResetEmail(this.auth, email);
            return { success: true, message: 'Link de redefinição enviado para o email.' };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    async completePasswordReset(email: string, code: string, newPass: string): Promise<{ success: boolean; message?: string }> {
        // No Firebase, a redefinição é feita no link enviado por email, não via código na App.
        return { success: false, message: 'Por favor, verifique o link enviado para o seu email.' };
    }
}
