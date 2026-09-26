import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '../../app/page';

describe('Management home page', () => {
  it('renders the neutral administration foundation', () => {
    render(<HomePage />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Wedding administration' })).toBeVisible();
    expect(screen.getByText('The management web foundation is ready.')).toBeVisible();
  });
});
