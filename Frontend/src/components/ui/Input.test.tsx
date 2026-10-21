import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './index';

const getInput = (container: HTMLElement): HTMLInputElement => {
  const input = container.querySelector('input');
  if (!input) throw new Error('No se encontró el <input>');
  return input;
};

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('applies error styling', () => {
    const { container } = render(<Input error="Error" />);
    expect(getInput(container)).toHaveClass('border-red-500');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    const { container } = render(<Input onChange={handleChange} />);
    const input = getInput(container);

    fireEvent.change(input, { target: { value: 'test' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('test');
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('is read-only when specified', () => {
    render(<Input readOnly value="readonly" />);
    // OJO: `toBeReadOnly` no es un matcher de jest-dom (no existe en v6 ni v7),
    // por eso este test llevaba fallando desde que se escribió. La forma correcta
    // de comprobar el atributo `readonly` es `toHaveAttribute`.
    expect(screen.getByDisplayValue('readonly')).toHaveAttribute('readonly');
  });

  it('forwards the ref to the underlying input', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});