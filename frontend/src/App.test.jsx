import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders scaffold heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /project fibula 1/i })).toBeTruthy();
  });
});
