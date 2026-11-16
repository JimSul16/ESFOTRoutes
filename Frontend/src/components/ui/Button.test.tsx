import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './index';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.firstChild).toHaveClass('bg-brand-600');
  });

  it('applies size classes', () => {
    const { container } = render(<Button size="lg">Large</Button>);
    expect(container.firstChild).toHaveClass('px-6');
  });

  it('is disabled when loading', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });

  it('muestra un spinner, bloquea el botón y anuncia la carga con isLoading', () => {
    render(<Button isLoading>Guardar</Button>);

    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('ocupa todo el ancho con fullWidth', () => {
    const { container } = render(<Button fullWidth>Ancho completo</Button>);
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Custom</Button>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  // El ref se reenvía al <button>: lo necesitan los componentes que lo
  // envuelven, y antes de tiparlo no había ninguna garantía.
  it('forwards the ref to the underlying button', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});