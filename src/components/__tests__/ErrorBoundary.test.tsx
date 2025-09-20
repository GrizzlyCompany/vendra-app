import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Mock safe utilities
jest.mock('../../lib/safe', () => ({
  safeString: jest.fn((value, defaultValue) => value || defaultValue),
  safeJsonStringify: jest.fn((value) => JSON.stringify(value))
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  // Component that throws an error
  const ErrorComponent = () => {
    throw new Error('Test error');
  };

  // Component that doesn't throw
  const SafeComponent = () => <div>Safe content</div>;

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByText('Ha ocurrido un error inesperado. Por favor, intenta nuevamente.')).toBeInTheDocument();
  });

  it('shows retry button and handles retry', async () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Intentar nuevamente');
    expect(retryButton).toBeInTheDocument();

    // Click retry - this should reset the error state
    fireEvent.click(retryButton);

    // The error should be cleared and children should be rendered again
    // Since ErrorComponent will throw again, we should see the error UI again
    await waitFor(() => {
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    });
  });

  it('shows retry count when retries have been attempted', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // First retry
    const retryButton = screen.getByText('Intentar nuevamente');
    fireEvent.click(retryButton);

    // Should show retry count
    expect(screen.getByText('Intentos de recuperación: 1/5')).toBeInTheDocument();
  });

  it('disables retry button after maximum attempts', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Intentar nuevamente');

    // Simulate 5 retries
    for (let i = 0; i < 5; i++) {
      fireEvent.click(retryButton);
    }

    expect(retryButton).toHaveTextContent('Máximo de intentos alcanzado');
    expect(retryButton).toBeDisabled();
  });

  it('shows custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument();
  });

  it('shows development error details in development mode', () => {
    // Mock NODE_ENV by setting it before render
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true
    });

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Detalles del error (desarrollo)')).toBeInTheDocument();
    expect(screen.getByText('Error ID:')).toBeInTheDocument();
  });

  it('hides development error details in production mode', () => {
    // Mock NODE_ENV by setting it before render
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true
    });

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Detalles del error (desarrollo)')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const mockOnError = jest.fn();

    render(
      <ErrorBoundary onError={mockOnError}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.objectContaining({
        message: 'Test error',
        errorId: expect.any(String),
        timestamp: expect.any(String),
        userAgent: expect.any(String),
        url: expect.any(String)
      })
    );
  });

  it('generates unique error IDs', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const firstErrorId = screen.getByText(/Error ID:/).textContent;

    // Re-render to trigger new error
    rerender(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const secondErrorId = screen.getByText(/Error ID:/).textContent;

    expect(firstErrorId).not.toBe(secondErrorId);
  });

  it('cleans up timeouts on unmount', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('handles nested error boundaries correctly', () => {
    const NestedError = () => (
      <ErrorBoundary fallback={<div>Nested error</div>}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    render(
      <ErrorBoundary>
        <NestedError />
      </ErrorBoundary>
    );

    // The outer boundary should catch the error from the inner one
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.queryByText('Nested error')).not.toBeInTheDocument();
  });
});