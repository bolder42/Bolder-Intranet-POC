import Link from 'next/link';

import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <>
      <RegisterForm />
      <p className="auth-alt">
        Already have an account? <Link href="/auth/login">Sign in</Link>
      </p>
    </>
  );
}