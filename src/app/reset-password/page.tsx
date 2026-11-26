import type { Metadata } from 'next';
import { ResetPasswordPage } from '@/features/account/ResetPasswordPage';

export const metadata: Metadata = {
  title: 'Atur ulang kata sandi',
};

export default function Page() {
  return <ResetPasswordPage />;
}
