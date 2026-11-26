import type { Metadata } from 'next';
import { SignInPage } from '@/features/account/SignInPage';

export const metadata: Metadata = {
  title: 'Masuk',
};

export default function Page() {
  return <SignInPage />;
}
