import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { components } from '../../lib/api/generated/schema';
import { ManagementIdentitySession } from '../identity-access/session';
import { ConsultationRequestsPage } from './intake-page';

const requestId = '00000000-0000-4000-8000-000000000101';
const consultationId = '00000000-0000-4000-8000-000000000102';
type Item = components['schemas']['ConsultationRequestList']['data'][number];

const newRequest: Item = {
  id: requestId,
  status: 'NEW',
  displayName: 'Minh & An',
  email: 'couple@example.com',
  phone: '0901234567',
  preferredDate: '2026-12-20',
  expectedGuests: 200,
  message: 'Muốn xem sảnh vườn trước khi đặt tiệc.',
  createdAt: '2026-10-09T00:00:00Z',
  consultationId: null,
  consultationRevision: null,
  brideName: null,
  groomName: null,
};

const fetchMock = vi.fn<(request: Request) => Promise<Response>>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3001/api/v1');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  });
}

function queueResponse(items: readonly Item[], nextCursor: string | null = null) {
  return jsonResponse({ data: items, nextCursor });
}

function restoreManager() {
  vi.spyOn(ManagementIdentitySession.prototype, 'restore').mockResolvedValue({
    status: 'authenticated',
    presentation: 'manager',
    denial: null,
    actor: {
      accountId: 'manager',
      displayEmail: 'manager@example.com',
      roles: ['MANAGER'],
      sessionId: 'session',
    },
  });
}

function useAuthorizedApi() {
  restoreManager();
  return vi
    .spyOn(ManagementIdentitySession.prototype, 'authorize')
    .mockImplementation((operation) => operation('manager-token'));
}

describe('ConsultationRequestsPage filters and search', () => {
  it('filters requests by status tab and KPI cards', async () => {
    useAuthorizedApi();
    const converted: Item = {
      ...newRequest,
      id: consultationId,
      status: 'CONVERTED',
      displayName: 'Lan & Nam',
      consultationId,
      consultationRevision: 3,
    };
    const closed: Item = {
      ...newRequest,
      id: '00000000-0000-4000-8000-000000000103',
      status: 'CLOSED',
      displayName: 'Hà & Bình',
      phone: '',
      preferredDate: null,
      expectedGuests: null,
      message: '',
    };
    fetchMock.mockResolvedValueOnce(queueResponse([newRequest, converted, closed]));
    render(<ConsultationRequestsPage />);

    expect(await screen.findByRole('heading', { name: 'Minh & An' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Lan & Nam' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Hà & Bình' })).toBeVisible();

    // Click "Chờ tiếp nhận" filter tab
    fireEvent.click(screen.getByRole('button', { name: /^Chờ tiếp nhận/ }));
    expect(screen.getByRole('heading', { name: 'Minh & An' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Lan & Nam' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hà & Bình' })).not.toBeInTheDocument();

    // Click "Đã mở tư vấn" filter tab
    fireEvent.click(screen.getByRole('button', { name: /^Đã mở tư vấn/ }));
    expect(screen.queryByRole('heading', { name: 'Minh & An' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lan & Nam' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Hà & Bình' })).not.toBeInTheDocument();

    // Click "Tất cả" filter tab
    fireEvent.click(screen.getByRole('button', { name: /^Tất cả/ }));
    expect(screen.getByRole('heading', { name: 'Minh & An' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Lan & Nam' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Hà & Bình' })).toBeVisible();

    // Click KPI card for "Chờ tiếp nhận"
    fireEvent.click(screen.getByRole('button', { name: /Thẻ thống kê: Chờ tiếp nhận/ }));
    expect(screen.getByRole('heading', { name: 'Minh & An' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Lan & Nam' })).not.toBeInTheDocument();
  });

  it('filters requests by search query and shows empty state when nothing matches', async () => {
    useAuthorizedApi();
    const item2: Item = {
      ...newRequest,
      id: consultationId,
      displayName: 'Hoàng & Mai',
      email: 'hoangmai@example.com',
    };
    fetchMock.mockResolvedValueOnce(queueResponse([newRequest, item2]));
    render(<ConsultationRequestsPage />);

    expect(await screen.findByRole('heading', { name: 'Minh & An' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Hoàng & Mai' })).toBeVisible();

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên/);
    fireEvent.change(searchInput, { target: { value: 'Hoàng' } });

    expect(screen.queryByRole('heading', { name: 'Minh & An' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hoàng & Mai' })).toBeVisible();

    // Search for non-existent text
    fireEvent.change(searchInput, { target: { value: 'xyz123nonexistent' } });
    expect(screen.queryByRole('heading', { name: 'Minh & An' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hoàng & Mai' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Không tìm thấy yêu cầu tư vấn nào phù hợp với bộ lọc hiện tại.'),
    ).toBeVisible();

    // Reset filter
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(screen.getByRole('heading', { name: 'Minh & An' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Hoàng & Mai' })).toBeVisible();
  });
});
