import type { Metadata } from 'next';
import { SignUpPage } from '@/features/account/SignUpPage';

export const metadata: Metadata = {
  title: 'Buat akun',
};

export default function Page() {
  return <SignUpPage />;
}
