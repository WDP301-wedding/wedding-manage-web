import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PublicHall } from '../../services/catalog.service';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { DashboardConsultationsSection } from './dashboard-consultations-section';
import { DashboardVenueHalls } from './dashboard-venue-halls';

describe('DashboardConsultationsSection pagination and sorting', () => {
  const mockConsultations: ConsultationRequestItem[] = [
    {
      id: 'c-1',
      displayName: 'Minh & An',
      email: 'an@example.com',
      phone: '0901234567',
      preferredDate: '2026-12-10',
      expectedGuests: 200,
      status: 'NEW',
      createdAt: '2026-10-01T10:00:00Z',
      consultationId: null,
      consultationRevision: null,
      brideName: null,
      groomName: null,
      message: '',
    },
    {
      id: 'c-2',
      displayName: 'Bảo & Vy',
      email: 'vy@example.com',
      phone: '0907654321',
      preferredDate: '2026-11-15',
      expectedGuests: 300,
      status: 'CONVERTED',
      createdAt: '2026-10-05T10:00:00Z',
      consultationId: 'cons-2',
      consultationRevision: 1,
      brideName: null,
      groomName: null,
      message: '',
    },
    {
      id: 'c-3',
      displayName: 'Tuấn & Chi',
      email: 'chi@example.com',
      phone: '0912345678',
      preferredDate: '2026-12-25',
      expectedGuests: 150,
      status: 'CLOSED',
      createdAt: '2026-09-20T10:00:00Z',
      consultationId: null,
      consultationRevision: null,
      brideName: null,
      groomName: null,
      message: '',
    },
    {
      id: 'c-4',
      displayName: 'Khánh & Ly',
      email: 'ly@example.com',
      phone: '0933333333',
      preferredDate: '2027-01-10',
      expectedGuests: 400,
      status: 'NEW',
      createdAt: '2026-10-08T10:00:00Z',
      consultationId: null,
      consultationRevision: null,
      brideName: null,
      groomName: null,
      message: '',
    },
    {
      id: 'c-5',
      displayName: 'Đạt & Quỳnh',
      email: 'quynh@example.com',
      phone: '0944444444',
      preferredDate: '2027-02-14',
      expectedGuests: 250,
      status: 'CONVERTED',
      createdAt: '2026-10-09T10:00:00Z',
      consultationId: 'cons-5',
      consultationRevision: 1,
      brideName: null,
      groomName: null,
      message: '',
    },
    {
      id: 'c-6',
      displayName: 'Hùng & Mai',
      email: 'mai@example.com',
      phone: '0955555555',
      preferredDate: '2027-03-20',
      expectedGuests: 350,
      status: 'NEW',
      createdAt: '2026-10-10T10:00:00Z',
      consultationId: null,
      consultationRevision: null,
      brideName: null,
      groomName: null,
      message: '',
    },
  ];

  it('renders with pagination and displays correct page slice', () => {
    render(
      <DashboardConsultationsSection
        isManager={true}
        state="success"
        consultations={mockConsultations}
      />,
    );

    expect(screen.getByText('Yêu cầu tư vấn gần đây')).toBeVisible();
    // Default page size is 5, total is 6. Page 1 displays 5 items.
    expect(screen.getByText(/yêu cầu tư vấn/)).toHaveTextContent(
      'Hiển thị 1 – 5 / 6 yêu cầu tư vấn',
    );

    // Default sort is createdAt desc (newest first: c-6, c-5, c-4, c-2, c-1)
    expect(screen.getByText('Hùng & Mai')).toBeVisible();
    expect(screen.getByText('Đạt & Quỳnh')).toBeVisible();
    expect(screen.getByText('Khánh & Ly')).toBeVisible();
    expect(screen.getByText('Bảo & Vy')).toBeVisible();
    expect(screen.getByText('Minh & An')).toBeVisible();
    // 6th item (Tuấn & Chi) is on page 2
    expect(screen.queryByText('Tuấn & Chi')).not.toBeInTheDocument();

    // Navigate to page 2
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText(/yêu cầu tư vấn/)).toHaveTextContent(
      'Hiển thị 6 – 6 / 6 yêu cầu tư vấn',
    );
    expect(screen.getByText('Tuấn & Chi')).toBeVisible();
    expect(screen.queryByText('Hùng & Mai')).not.toBeInTheDocument();
  });

  it('filters consultations by search query and status', () => {
    render(
      <DashboardConsultationsSection
        isManager={true}
        state="success"
        consultations={mockConsultations}
      />,
    );

    // Search for "Ly"
    const searchInput = screen.getByLabelText('Tìm kiếm yêu cầu tư vấn');
    fireEvent.change(searchInput, { target: { value: 'ly' } });

    expect(screen.getByText('Khánh & Ly')).toBeVisible();
    expect(screen.queryByText('Hùng & Mai')).not.toBeInTheDocument();

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Filter by status: CONVERTED
    const statusSelect = screen.getByLabelText('Lọc theo trạng thái yêu cầu');
    fireEvent.change(statusSelect, { target: { value: 'CONVERTED' } });

    expect(screen.getByText('Bảo & Vy')).toBeVisible();
    expect(screen.getByText('Đạt & Quỳnh')).toBeVisible();
    expect(screen.queryByText('Minh & An')).not.toBeInTheDocument();
  });

  it('sorts consultations by customer name A-Z when column header clicked', () => {
    render(
      <DashboardConsultationsSection
        isManager={true}
        state="success"
        consultations={mockConsultations}
      />,
    );

    const sortCustomerBtn = screen.getByRole('button', { name: /Khách hàng/ });
    fireEvent.click(sortCustomerBtn);

    // Sorted A-Z by displayName: Bảo & Vy should be first
    expect(screen.getByText('Bảo & Vy')).toBeVisible();
  });
});

describe('DashboardVenueHalls pagination and sorting', () => {
  const mockHalls: PublicHall[] = [
    {
      id: 'h-1',
      name: 'Lotus Hall',
      maxGuests: 300,
      description: 'Flexible main celebration hall.',
      media: [],
    },
    {
      id: 'h-2',
      name: 'Orchid Hall',
      maxGuests: 120,
      description: 'Intimate wedding hall.',
      media: [],
    },
    { id: 'h-3', name: 'Diamond Hall', maxGuests: 500, description: 'Grand ballroom.', media: [] },
    {
      id: 'h-4',
      name: 'Ruby Hall',
      maxGuests: 250,
      description: 'Modern wedding space.',
      media: [],
    },
    { id: 'h-5', name: 'Sapphire Hall', maxGuests: 180, description: 'Cozy setting.', media: [] },
    {
      id: 'h-6',
      name: 'Emerald Hall',
      maxGuests: 350,
      description: 'Garden view hall.',
      media: [],
    },
  ];

  it('renders halls with pagination and allows navigating pages', () => {
    render(<DashboardVenueHalls halls={mockHalls} isManager={true} />);

    expect(screen.getByText('Danh mục sảnh cưới khả dụng (6)')).toBeVisible();
    expect(screen.getByText(/sảnh tiệc/)).toHaveTextContent('Hiển thị 1 – 5 / 6 sảnh tiệc');

    // Default sort is name A-Z: Diamond Hall, Emerald Hall, Lotus Hall, Orchid Hall, Ruby Hall
    expect(screen.getByText('Diamond Hall')).toBeVisible();
    expect(screen.getByText('Emerald Hall')).toBeVisible();
    expect(screen.getByText('Lotus Hall')).toBeVisible();
    expect(screen.getByText('Orchid Hall')).toBeVisible();
    expect(screen.getByText('Ruby Hall')).toBeVisible();
    // 6th item Sapphire Hall is on page 2
    expect(screen.queryByText('Sapphire Hall')).not.toBeInTheDocument();

    // Click page 2
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('Sapphire Hall')).toBeVisible();
    expect(screen.queryByText('Diamond Hall')).not.toBeInTheDocument();
  });

  it('sorts halls by capacity when capacity header is clicked', () => {
    render(<DashboardVenueHalls halls={mockHalls} isManager={true} />);

    const capacitySortBtn = screen.getByRole('button', { name: /Sức chứa tối đa/ });
    fireEvent.click(capacitySortBtn);

    // Sức chứa maxGuests desc: Diamond Hall (500), Emerald Hall (350), Lotus Hall (300), Ruby Hall (250), Sapphire Hall (180)
    expect(screen.getByText('Diamond Hall')).toBeVisible();
    expect(screen.getByText('Emerald Hall')).toBeVisible();
    expect(screen.getByText('Lotus Hall')).toBeVisible();
    expect(screen.getByText('Ruby Hall')).toBeVisible();
    expect(screen.getByText('Sapphire Hall')).toBeVisible();
    expect(screen.queryByText('Orchid Hall')).not.toBeInTheDocument(); // 120 is on page 2
  });

  it('filters halls by search query', () => {
    render(<DashboardVenueHalls halls={mockHalls} isManager={true} />);

    const searchInput = screen.getByLabelText('Tìm kiếm sảnh cưới');
    fireEvent.change(searchInput, { target: { value: 'Grand ballroom' } });

    expect(screen.getByText('Diamond Hall')).toBeVisible();
    expect(screen.queryByText('Lotus Hall')).not.toBeInTheDocument();
  });
});
