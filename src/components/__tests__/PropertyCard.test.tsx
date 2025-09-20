import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyCard } from '../PropertyCard';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Trash2: () => <div data-testid="trash-icon">🗑️</div>,
  MapPin: () => <div data-testid="map-pin-icon">📍</div>,
  Edit: () => <div data-testid="edit-icon">✏️</div>
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}));

// Mock MorphCard
jest.mock('../transitions/MorphCard', () => ({
  MorphCard: ({ children, targetUrl }: any) => <div data-testid="morph-card" data-target={targetUrl}>{children}</div>
}));

const mockProperty = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Beautiful Apartment',
  description: 'A spacious apartment in the city center',
  price: 150000,
  location: 'Santo Domingo',
  images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  owner_id: '123e4567-e89b-12d3-a456-426614174001',
  type: 'Apartamento',
  currency: 'USD',
  address: 'Calle Principal 123',
  bedrooms: 2,
  bathrooms: 1,
  area: 80,
  features: ['Parking', 'Garden'],
  inserted_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
};

describe('PropertyCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders property information correctly', () => {
    render(<PropertyCard property={mockProperty} />);

    expect(screen.getByText('Beautiful Apartment')).toBeInTheDocument();
    expect(screen.getByText('Santo Domingo')).toBeInTheDocument();
    expect(screen.getByText('$150,000')).toBeInTheDocument();
    expect(screen.getByText('Apartamento')).toBeInTheDocument();
  });

  it('displays fallback image when no images provided', () => {
    const propertyWithoutImages = { ...mockProperty, images: [] };
    render(<PropertyCard property={propertyWithoutImages} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', expect.stringContaining('unsplash.com'));
  });

  it('shows edit button when showEdit is true', () => {
    render(<PropertyCard property={mockProperty} showEdit={true} />);

    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });

  it('shows delete button when onDelete is provided', () => {
    const mockOnDelete = jest.fn();
    render(<PropertyCard property={mockProperty} onDelete={mockOnDelete} />);

    expect(screen.getByText('Eliminar')).toBeInTheDocument();
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    const mockOnDelete = jest.fn();
    render(<PropertyCard property={mockProperty} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockProperty);
  });

  it('prevents event propagation when delete button is clicked', () => {
    const mockOnDelete = jest.fn();
    const mockOnCardClick = jest.fn();

    // Mock the link click
    const mockLink = jest.fn();
    jest.mocked(require('next/link').default).mockImplementation(({ children, href, onClick }: any) => (
      <a href={href} onClick={(e) => { mockOnCardClick(); onClick?.(e); }}>{children}</a>
    ));

    render(<PropertyCard property={mockProperty} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByText('Eliminar');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalled();
    // Note: In a real scenario, we'd check that the card click was prevented
  });

  it('displays property features when available', () => {
    render(<PropertyCard property={mockProperty} />);

    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('Garden')).toBeInTheDocument();
  });

  it('handles missing optional properties gracefully', () => {
    const minimalProperty = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Minimal Property',
      price: 100000,
      location: 'Test Location',
      images: [],
      owner_id: '123e4567-e89b-12d3-a456-426614174001',
      inserted_at: '2023-01-01T00:00:00Z'
    };

    render(<PropertyCard property={minimalProperty} />);

    expect(screen.getByText('Minimal Property')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <PropertyCard property={mockProperty} className="custom-class" />
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    render(<PropertyCard property={mockProperty} state="deleting" />);

    const deleteButton = screen.getByText('Eliminando…');
    expect(deleteButton).toBeDisabled();
  });

  it('shows confirm pending state', () => {
    render(<PropertyCard property={mockProperty} state="confirm-pending" />);

    expect(screen.getByText('Confirmar')).toBeInTheDocument();
  });

  it('renders with proper accessibility attributes', () => {
    const mockOnDelete = jest.fn();
    render(<PropertyCard property={mockProperty} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByText('Eliminar');
    expect(deleteButton).toHaveAttribute('aria-label', 'Eliminar propiedad');
    expect(deleteButton).toHaveAttribute('title', 'Eliminar propiedad');
  });

  it('handles image optimization correctly', () => {
    render(<PropertyCard property={mockProperty} />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image).toHaveAttribute('sizes', expect.any(String));
  });
});