import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('renders the email and password inputs and the submit button', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('links to the register page', () => {
    render(<LoginForm />);

    expect(screen.getByRole('link', { name: 'Create one' })).toHaveAttribute(
      'href',
      '/auth/register',
    );
  });
});