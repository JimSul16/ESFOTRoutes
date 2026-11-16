import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './index';

describe('Badge', () => {
  it('renders with text', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toHaveClass('bg-surface-100');
  });

  it('applies success variant', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    expect(container.firstChild).toHaveClass('bg-surface-900');
  });

  it('applies danger variant', () => {
    const { container } = render(<Badge variant="danger">Error</Badge>);
    expect(container.firstChild).toHaveClass('bg-brand-600');
  });

  it('applies accent variant', () => {
    const { container } = render(<Badge variant="accent">Warning</Badge>);
    expect(container.firstChild).toHaveClass('border-surface-400');
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom">Custom</Badge>);
    expect(container.firstChild).toHaveClass('custom');
  });
});