import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import CommandError from './error';

describe('Command route error fallback', () => {
  it('renders a safe retry state without exposing the underlying error', () => {
    const html = renderToStaticMarkup(
      <CommandError error={new Error('sensitive internal detail')} reset={vi.fn()} />
    );

    expect(html).toContain('This view could not be loaded.');
    expect(html).toContain('Try again');
    expect(html).toContain('Go to Home');
    expect(html).not.toContain('sensitive internal detail');
  });
});
