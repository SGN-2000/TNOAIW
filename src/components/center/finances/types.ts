
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  authorId: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Manager {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'admin-plus';
}

export interface FinancePermissions {
  publicVisibility: boolean;
  managers: { [userId: string]: true };
}

export interface FinanceData {
  transactions: { [transactionId: string]: Transaction };
  categories: Category[];
  permissions: FinancePermissions;
}
