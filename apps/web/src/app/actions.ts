'use server';

import { signOut } from '@/auth';

/**
 * Server action used by the app shell's sign-out button.
 * Lives in a Node-runtime module so the Sidebar stays a plain server component.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/auth/login' });
}
