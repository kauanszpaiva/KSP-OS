import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PortalError from './error';

describe('Portal route error fallback', () => {
  it('renders client-safe recovery copy without exposing the underlying error', () => {
    const html = renderToStaticMarkup(
      <PortalError error={new Error('internal provider detail')} reset={vi.fn()} />
    );

    expect(html).toContain('We could not load this page.');
    expect(html).toContain('Try again');
    expect(html).toContain('Go to Home');
    expect(html).not.toContain('internal provider detail');
  });
});
