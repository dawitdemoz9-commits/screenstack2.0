import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import AdminLayout from '@/components/admin/AdminLayout';

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return <AdminLayout user={user}>{children}</AdminLayout>;
}
