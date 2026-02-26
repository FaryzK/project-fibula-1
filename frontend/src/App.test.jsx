import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { useAuthStore } from './stores/authStore';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false
    });
  });

  it('renders scaffold heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /project fibula 1/i })).toBeTruthy();
  });

  it('shows Google sign in action when user is not authenticated', async () => {
    const { container } = render(<App />);
    expect(
      await within(container).findByRole('button', {
        name: /sign in with google/i
      })
    ).toBeTruthy();
  });
});
