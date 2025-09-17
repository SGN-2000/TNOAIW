"use client"

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ref, onValue, off, get, child } from 'firebase/database';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus, Banknote, ChevronDown, Users } from 'lucide-react';
import type { Transaction, FinanceData, Manager, Category } from '@/components/center/finances/types';
import FinancesOverview from '@/components/center/finances/finances-overview';
import TransactionsTable from '@/components/center/finances/transactions-table';
import FinanceChart from '@/components/center/finances/finance-chart';
import TransactionForm from '@/components/center/finances/transaction-form';
import FinanceProjection from '@/components/center/finances/finance-projection';
import { initializeFinanceData } from '@/lib/finance-helpers';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import CategoryDistributionCharts from '@/components/center/finances/category-distribution-charts';
import PermissionsManager from '@/components/center/finances/permissions-manager';

export default function FinancesPage() {
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'member'>('member');
  const [loading, setLoading] = useState(true);
  const [isTransactionFormOpen, setTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [potentialManagers, setPotentialManagers] = useState<Manager[]>([]);
  const [isPermissionsOpen, setPermissionsOpen] = useState(false);

  const { user } = useAuth();
  const params = useParams();
  const centerId = Array.isArray(params.centerId) ? params.centerId[0] : params.centerId;

  useEffect(() => {
    if (!centerId || !user) return;

    const financeRef = ref(db, `centers/${centerId}/finances`);
    const centerRef = ref(db, `centers/${centerId}`);

    const fetchData = async () => {
      setLoading(true);
      
      await initializeFinanceData(centerId);
      
      const centerSnap = await get(centerRef);
      if (!centerSnap.exists()) {
        setLoading(false);
        return;
      }
      const centerData = centerSnap.val();

      const financeListener = onValue(financeRef, (snapshot) => {
        const data = snapshot.val() as FinanceData;
        setFinanceData(data);

        const isOwner = user.uid === centerData.ownerId;
        const isManager = data?.permissions?.managers && data.permissions.managers[user.uid];
        
        if (isOwner) setUserRole('owner');
        else if (isManager) setUserRole('manager');
        else setUserRole('member');
        
        setLoading(false);
      });
      
      // Fetch potential managers for the permissions dialog
      const adminIds = Object.keys(centerData.members.admins || {});
      const adminPlusIds = Object.keys(centerData.members.adminsPlus || {});
      const potentialManagerIds = [...new Set([...adminIds, ...adminPlusIds])];
      
      const managerPromises = potentialManagerIds.map(async (id) => {
        const userSnap = await get(child(ref(db, 'users'), id));
        if (userSnap.exists()) {
          const userData = userSnap.val();
          return {
            id,
            name: `${userData.name} ${userData.surname}`,
            username: userData.username,
            role: adminPlusIds.includes(id) ? 'admin-plus' : 'admin'
          };
        }
        return null;
      });
      const resolvedManagers = (await Promise.all(managerPromises)).filter(Boolean) as Manager[];
      setPotentialManagers(resolvedManagers);

      return () => {
        off(financeRef, 'value', financeListener);
      };
    };

    let cleanup: (() => void) | undefined;
    fetchData().then(c => { cleanup = c; });

    return () => cleanup?.();
  }, [centerId, user]);

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionFormOpen(true);
  };
  
  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setTransactionFormOpen(true);
  }
  
  const closeTransactionForm = () => {
    setTransactionFormOpen(false);
    setEditingTransaction(null);
  }

  const transactions = financeData?.transactions ? Object.values(financeData.transactions).filter(t => t?.id) : [];
  const categories = financeData?.categories ? Object.values(financeData.categories) : [];
  
  const canManage = userRole === 'owner' || userRole === 'manager';
  const isOwner = userRole === 'owner';

  if (loading || !financeData) {
    return <div className="flex flex-1 justify-center items-center p-4"><Loader /></div>;
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Banknote className="h-8 w-8" />
          Finanzas
        </h2>
        <div className="flex gap-2">
           {canManage && (
            <Dialog open={isTransactionFormOpen} onOpenChange={setTransactionFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddTransaction}>
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir Transacción
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingTransaction ? 'Editar' : 'Añadir'} Transacción</DialogTitle>
                </DialogHeader>
                <TransactionForm
                  centerId={centerId}
                  categories={categories}
                  onTransactionSaved={closeTransactionForm}
                  onCancel={closeTransactionForm}
                  existingTransaction={editingTransaction}
                />
              </DialogContent>
            </Dialog>
          )}
          {isOwner && (
            <Dialog open={isPermissionsOpen} onOpenChange={setPermissionsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Finanzas N
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                 <DialogHeader>
                  <DialogTitle>Gestionar Finanzas N</DialogTitle>
                  <DialogDescription>Designa quién puede gestionar las finanzas del centro.</DialogDescription>
                </DialogHeader>
                <PermissionsManager
                  centerId={centerId}
                  currentManagers={financeData.permissions?.managers || {}}
                  potentialManagers={potentialManagers}
                  onSave={() => setPermissionsOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <p className="text-muted-foreground">
        Gestiona y visualiza el estado financiero de tu centro de estudiantes.
      </p>

      <div className="space-y-8">
        <FinancesOverview transactions={transactions} />
        
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <span className="flex items-center gap-2 text-lg font-semibold">
                        <ChevronDown className="h-5 w-5 transition-transform duration-200" />
                        Ver / Ocultar Historial de Transacciones
                    </span>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="pt-4">
                        <TransactionsTable 
                          transactions={transactions} 
                          categories={categories}
                          canManage={canManage}
                          centerId={centerId}
                          onEdit={handleEditTransaction}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
             <FinanceChart transactions={transactions} />
             <CategoryDistributionCharts transactions={transactions} categories={categories} />
        </div>
        
        {canManage && (
          <div className="mt-8">
             <FinanceProjection centerId={centerId} transactions={transactions} categories={categories} />
          </div>
        )}
      </div>
    </div>
  );
}

    
