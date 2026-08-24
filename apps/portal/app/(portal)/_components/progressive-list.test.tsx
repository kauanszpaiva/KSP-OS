import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressiveList } from './progressive-list';

describe('ProgressiveList', () => {
  it('limits the first layer and exposes the remaining item count', () => {
    render(
      <ProgressiveList initial={2}>
        <p>First</p>
        <p>Second</p>
        <p>Third</p>
      </ProgressiveList>
    );

    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.queryByText('Third')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show 1 more' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('expands and collapses the full list', () => {
    render(
      <ProgressiveList initial={1}>
        <p>First</p>
        <p>Second</p>
      </ProgressiveList>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show 1 more' }));
    expect(screen.getByText('Second')).toBeTruthy();
    const collapse = screen.getByRole('button', { name: 'Show less' });
    expect(collapse.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(collapse);
    expect(screen.queryByText('Second')).toBeNull();
  });
});
