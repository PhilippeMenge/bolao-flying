import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin');

  return (
    <div className="rise">
      <h1 className="font-display text-4xl uppercase leading-none text-tinta">Admin 🔐</h1>
      <p className="mt-2 text-sm text-tinta/70">Área do dono do bolão.</p>
      <AdminLoginForm />
    </div>
  );
}
