import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function failureResponse(status: number) {
  return jsonResponse(
    { error: { code: 'REQUEST_DENIED', message: 'Request denied', requestId } },
    status,
  );
}

function useAuthorizedApi() {
  restoreManager();
  return vi
    .spyOn(ManagementIdentitySession.prototype, 'authorize')
    .mockImplementation((operation) => operation('manager-token'));
}

function requestAt(index: number) {
  return fetchMock.mock.calls[index]![0];
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

describe('Consultation navigation', () => {
  it('renders contact details, optional fields and the booking hand-off for each request state', async () => {
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
    const fresh = (await screen.findByRole('heading', { name: 'Minh & An' })).closest('article')!;
    expect(within(fresh).getByText('Cần tiếp nhận')).toBeVisible();
    expect(within(fresh).getByRole('link', { name: newRequest.email })).toHaveAttribute(
      'href',
      `mailto:${newRequest.email}`,
    );
    expect(within(fresh).getByRole('link', { name: newRequest.phone })).toHaveAttribute(
      'href',
      `tel:${newRequest.phone}`,
    );
    expect(within(fresh).getByText(newRequest.preferredDate!)).toBeVisible();
    expect(within(fresh).getByText('200')).toBeVisible();
    expect(within(fresh).getByText(newRequest.message)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tiếp tục đặt tiệc' })).toHaveAttribute(
      'href',
      expect.stringContaining(`/bookings?consultationId=${consultationId}&consultationRevision=3`),
    );
    const closedArticle = screen
      .getByRole('heading', { name: closed.displayName })
      .closest('article')!;
    expect(within(closedArticle).getByText('Đã đóng')).toBeVisible();
    expect(within(closedArticle).getByText('Chưa chọn')).toBeVisible();
    expect(within(closedArticle).getByText('Chưa cung cấp')).toBeVisible();
    expect(within(closedArticle).queryByRole('button')).not.toBeInTheDocument();
    expect(
      within(closedArticle).queryByRole('link', { name: 'Tiếp tục đặt tiệc' }),
    ).not.toBeInTheDocument();
    const request = requestAt(0);
    expect(request.method).toBe('GET');
    expect(request.headers.get('Authorization')).toBe('Bearer manager-token');
    expect(new URL(request.url).searchParams.get('limit')).toBe('20');
    expect(new URL(request.url).searchParams.has('cursor')).toBe(false);
  });

  it('appends a cursor page without removing the requests already displayed', async () => {
    useAuthorizedApi();
    let resolvePage!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(queueResponse([newRequest], 'next-request-page'))
      .mockImplementationOnce(() => new Promise((resolve) => (resolvePage = resolve)));
    render(<ConsultationRequestsPage />);
    await screen.findByRole('heading', { name: newRequest.displayName });
    fireEvent.click(screen.getByRole('button', { name: 'Xem thêm yêu cầu' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Xem thêm yêu cầu' })).toBeDisabled();
    expect(new URL(requestAt(1).url).searchParams.get('cursor')).toBe('next-request-page');
    resolvePage(queueResponse([{ ...newRequest, id: consultationId, displayName: 'Lan & Nam' }]));
    await screen.findByRole('heading', { name: 'Lan & Nam' });
    expect(screen.getByRole('heading', { name: newRequest.displayName })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Xem thêm yêu cầu' })).not.toBeInTheDocument();
  });

  it('opens one consultation and refreshes the request into a booking hand-off', async () => {
    useAuthorizedApi();
    fetchMock
      .mockResolvedValueOnce(queueResponse([newRequest]))
      .mockResolvedValueOnce(jsonResponse({ data: { consultationId } }))
      .mockResolvedValueOnce(
        queueResponse([
          { ...newRequest, status: 'CONVERTED', consultationId, consultationRevision: 1 },
        ]),
      );
    render(<ConsultationRequestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mở hồ sơ tư vấn' }));
    expect(await screen.findByRole('link', { name: 'Tiếp tục đặt tiệc' })).toHaveAttribute(
      'href',
      expect.stringContaining(`/bookings?consultationId=${consultationId}&consultationRevision=1`),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Đã mở hồ sơ tư vấn');
    expect(screen.queryByRole('button', { name: 'Mở hồ sơ tư vấn' })).not.toBeInTheDocument();
    const conversion = requestAt(1);
    expect(conversion.method).toBe('POST');
    expect(new URL(conversion.url).pathname).toBe(
      `/api/v1/management/consultation-requests/${requestId}/conversion`,
    );
    expect(conversion.headers.get('Authorization')).toBe('Bearer manager-token');
    expect(requestAt(2).method).toBe('GET');
  });

  it('disables duplicate actions while closing a request and refreshes the closed state', async () => {
    useAuthorizedApi();
    let resolveClose!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(queueResponse([newRequest]))
      .mockImplementationOnce(() => new Promise((resolve) => (resolveClose = resolve)))
      .mockResolvedValueOnce(queueResponse([{ ...newRequest, status: 'CLOSED' }]));
    render(<ConsultationRequestsPage />);
    const close = await screen.findByRole('button', { name: 'Đóng yêu cầu' });
    fireEvent.click(close);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(close).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mở hồ sơ tư vấn' })).toBeDisabled();
    fireEvent.click(close);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolveClose(jsonResponse({ data: { consultationId: null } }));
    expect(await screen.findByText('Đã đóng yêu cầu tư vấn.')).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Đóng yêu cầu' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Đã đóng')).toBeVisible();
    expect(requestAt(1).method).toBe('POST');
    expect(new URL(requestAt(1).url).pathname).toBe(
      `/api/v1/management/consultation-requests/${requestId}/closure`,
    );
  });

  it.each(['Mở hồ sơ tư vấn', 'Đóng yêu cầu'])(
    'keeps the request visible after a failed %s and allows a state refresh',
    async (action) => {
      useAuthorizedApi();
      fetchMock
        .mockResolvedValueOnce(queueResponse([newRequest]))
        .mockResolvedValueOnce(failureResponse(409))
        .mockResolvedValueOnce(queueResponse([newRequest]));
      render(<ConsultationRequestsPage />);
      fireEvent.click(await screen.findByRole('button', { name: action }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Không hoàn tất được thao tác');
      expect(screen.getByRole('heading', { name: newRequest.displayName })).toBeVisible();
      expect(screen.getByRole('button', { name: action })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    },
  );

  it.each([401, 403])('hides the queue when loading is denied with HTTP %s', async (status) => {
    useAuthorizedApi();
    fetchMock.mockResolvedValueOnce(failureResponse(status));
    render(<ConsultationRequestsPage />);
    expect(await screen.findByText('Cần tài khoản Quản lý')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Tải lại' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: newRequest.displayName })).not.toBeInTheDocument();
  });

  it.each([401, 403])(
    'removes request data when an action loses access with HTTP %s',
    async (status) => {
      useAuthorizedApi();
      fetchMock
        .mockResolvedValueOnce(queueResponse([newRequest]))
        .mockResolvedValueOnce(failureResponse(status));
      render(<ConsultationRequestsPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Mở hồ sơ tư vấn' }));
      expect(await screen.findByText('Cần tài khoản Quản lý')).toBeVisible();
      expect(screen.queryByText(newRequest.email)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Tải lại' })).not.toBeInTheDocument();
    },
  );

  it('reports a missing queue response and allows retry instead of showing an empty queue', async () => {
    useAuthorizedApi();
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(queueResponse([]));
    render(<ConsultationRequestsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được yêu cầu tư vấn');
    expect(screen.queryByText('Chưa có yêu cầu tư vấn')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(await screen.findByText('Chưa có yêu cầu tư vấn')).toBeVisible();
  });

  it.each(['anonymous', 'staff', 'failure'])(
    'does not request private consultation data for a %s session',
    async (state) => {
      const restore = vi.spyOn(ManagementIdentitySession.prototype, 'restore');
      const authorize = vi.spyOn(ManagementIdentitySession.prototype, 'authorize');
      if (state === 'failure') restore.mockRejectedValue(new Error('offline'));
      else if (state === 'anonymous')
        restore.mockResolvedValue({ status: 'anonymous', denial: null });
      else
        restore.mockResolvedValue({
          status: 'authenticated',
          presentation: 'staff',
          denial: null,
          actor: {
            accountId: requestId,
            displayEmail: 'staff@example.com',
            roles: ['STAFF'],
            sessionId: requestId,
          },
        });
      render(<ConsultationRequestsPage />);
      expect(await screen.findByText('Cần tài khoản Quản lý')).toBeVisible();
      expect(authorize).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('does not load private data after the page unmounts during session restoration', async () => {
    let finishRestore!: (
      snapshot: Awaited<ReturnType<ManagementIdentitySession['restore']>>,
    ) => void;
    vi.spyOn(ManagementIdentitySession.prototype, 'restore').mockImplementation(
      () => new Promise((resolve) => (finishRestore = resolve)),
    );
    const authorize = vi.spyOn(ManagementIdentitySession.prototype, 'authorize');
    const { unmount } = render(<ConsultationRequestsPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang xác minh quyền quản lý');
    unmount();
    await act(() =>
      Promise.resolve(
        finishRestore({
          status: 'authenticated',
          presentation: 'manager',
          denial: null,
          actor: {
            accountId: requestId,
            displayEmail: 'manager@example.com',
            roles: ['MANAGER'],
            sessionId: requestId,
          },
        }),
      ),
    );
    expect(authorize).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('conceals request data after logout fails and explains the delivery failure', async () => {
    useAuthorizedApi();
    fetchMock.mockResolvedValueOnce(queueResponse([newRequest]));
    vi.spyOn(ManagementIdentitySession.prototype, 'logout').mockRejectedValue(new Error('offline'));
    render(<ConsultationRequestsPage />);
    await screen.findByRole('heading', { name: newRequest.displayName });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể kết nối máy chủ để đăng xuất',
    );
    expect(screen.getByText('Cần tài khoản Quản lý')).toBeVisible();
    expect(screen.queryByText(newRequest.email)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
  });

  it('keeps the sidebar available while loading, after a server failure and after retry', async () => {
    restoreManager();
    const authorize = vi
      .spyOn(ManagementIdentitySession.prototype, 'authorize')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ data: { data: [], nextCursor: null } });
    render(<ConsultationRequestsPage />);
    const sidebar = screen.getByRole('navigation', { name: 'Điều hướng vận hành' });
    expect(sidebar).toBeVisible();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được yêu cầu tư vấn');
    expect(within(sidebar).getByRole('link', { name: 'Yêu cầu tư vấn' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getByRole('link', { name: 'Đặt tiệc' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(await screen.findByText('Chưa có yêu cầu tư vấn')).toBeVisible();
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(sidebar).toBeVisible();
  });

  it('logs out from the consultation sidebar and hides management content', async () => {
    restoreManager();
    vi.spyOn(ManagementIdentitySession.prototype, 'authorize').mockResolvedValue({
      data: { data: [], nextCursor: null },
    });
    const logout = vi.spyOn(ManagementIdentitySession.prototype, 'logout').mockResolvedValue();
    render(<ConsultationRequestsPage />);
    expect(await screen.findByText('Chưa có yêu cầu tư vấn')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Cần tài khoản Quản lý')).toBeVisible();
    expect(screen.queryByText('Chưa có yêu cầu tư vấn')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
  });
});
