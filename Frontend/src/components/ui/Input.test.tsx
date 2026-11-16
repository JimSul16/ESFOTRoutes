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

  it('asocia el error con aria-invalid y aria-describedby', () => {
    const { container } = render(<Input label="Correo" error="Correo inválido" />);
    const input = getInput(container);
    const error = screen.getByText('Correo inválido');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('muestra el hint y lo asocia al campo', () => {
    const { container } = render(<Input label="Nombre" hint="Máximo 40 caracteres" />);
    const input = getInput(container);
    const hint = screen.getByText('Máximo 40 caracteres');

    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAttribute('aria-describedby', hint.id);
  });

  it('prioriza el error sobre el hint', () => {
    render(<Input hint="Ayuda" error="Obligatorio" />);

    expect(screen.getByText('Obligatorio')).toBeInTheDocument();
    expect(screen.queryByText('Ayuda')).toBeNull();
  });

  it('alterna la visibilidad de la contraseña', () => {
    const { container } = render(<Input label="Contraseña" type="password" />);
    const input = getInput(container);

    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(input).toHaveAttribute('type', 'password');
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