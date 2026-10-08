import { redirect } from 'next/navigation';

import { auth } from '@/auth';

/**
 * Root entry point. Sends authenticated users to the app shell and everyone
 * else to the auth shell.
 */
export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  redirect('/app');
}
