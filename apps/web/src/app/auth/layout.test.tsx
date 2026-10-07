import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AuthLayout from './layout';

describe('AuthLayout', () => {
  it('renders its children inside the auth card', () => {
    const { container } = render(
      <AuthLayout>
        <p>Login content</p>
      </AuthLayout>,
    );

    expect(screen.getByText('Login content')).toBeInTheDocument();
    expect(container.querySelector('.auth-shell')).not.toBeNull();
    expect(container.querySelector('.auth-card')).not.toBeNull();
  });
});