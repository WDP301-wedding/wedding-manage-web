'use client';

import type { FormEvent } from 'react';
import { StaffDirectory } from './staff-directory';
import type { StaffReasonAction } from './staff-reason-dialog';
import { RefreshCw } from 'lucide-react';
import { cn } from 'cn';
import type { EventAssignmentItem } from '../../services/staff.service';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  cardClass,
  cardHintClass,
  cardTitleClass,
  labelClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from './staff-classes';

export interface StaffManagementSectionProps {
  bookingId: string;
  staffAccountId: string;
  staffAccountLabel?: string;
  accountId: string;
  needsPassword: boolean;
  onSelectStaff: (id: string, label: string, setup: boolean) => void;
  onReason: StaffReasonAction;
  assignmentsReady: boolean;
  assignmentError: string | null;
  pending: boolean;
  assignments: readonly EventAssignmentItem[];
  loadingAssignments: boolean;
  onLoadAssignments: () => Promise<void>;
  onProvisionStaff: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAssignStaff: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRevokeAssignment: (assignmentId: string) => void;
}

function AssignmentsTable({
  assignments,
  pending,
  onRevokeAssignment,
}: Readonly<{
  assignments: readonly EventAssignmentItem[];
  pending: boolean;
  onRevokeAssignment: (assignmentId: string) => void;
}>) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead className="bg-muted">
          <tr>
            <th className={thClass}>Nhân viên</th>
            <th className={thClass}>Trạng thái</th>
            <th className={cn(thClass, 'text-right')}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((item) => (
            <tr key={item.assignmentId} className="border-t border-border">
              <td className={tdClass}>
                <span>{item.staffLabel ?? 'Nhân viên chưa có tên hiển thị'}</span>
              </td>
              <td className={tdClass}>
                {item.status === 'ACTIVE' ? (
                  <Badge variant="success">Đang phân công</Badge>
                ) : (
                  <Badge variant="neutral">Đã thu hồi</Badge>
                )}
              </td>
              <td className={cn(tdClass, 'text-right')}>
                {item.status === 'ACTIVE' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-hy-error-bg"
                    disabled={pending}
                    onClick={() => void onRevokeAssignment(item.assignmentId)}
                  >
                    Thu hồi
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StaffManagementSection({
  bookingId,
  staffAccountId,
  staffAccountLabel = '',
  pending,
  assignments,
  loadingAssignments,
  onLoadAssignments,
  onProvisionStaff,
  onAssignStaff,
  onRevokeAssignment,
  accountId,
  needsPassword,
  onSelectStaff,
  onReason,
  assignmentsReady,
  assignmentError,
}: Readonly<StaffManagementSectionProps>) {
  return (
    <section aria-label="Tài khoản và phân công nhân sự" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-6">
        <details className={cn(cardClass, 'order-last w-full')}>
          <summary className="cursor-pointer font-semibold">
            Cấp hoặc khôi phục quyền nhân viên
          </summary>
          <p className={cardHintClass}>
            Dùng email để cấp tài khoản mới hoặc cấp lại quyền tác nghiệp.
          </p>
          <form onSubmit={onProvisionStaff} className="flex flex-col gap-3">
            <label className={labelClass}>
              Email nhân viên
              <Input
                className="font-normal"
                name="email"
                type="email"
                required
                placeholder="ten.nhanvien@nhahang.vn"
              />
            </label>
            <Button type="submit" className="self-start" disabled={pending}>
              Cấp tài khoản
            </Button>
          </form>
        </details>

        <div className={cn(cardClass, 'flex-[1_1_380px]')}>
          <div className="flex flex-col gap-0.5">
            <h3 className={cardTitleClass}>Phân công nhân sự vào tiệc</h3>
            <p className={cardHintClass}>
              Nhân viên được phân công mới mở được bàn đón khách của tiệc.
            </p>
          </div>
          <StaffDirectory
            selectedId={staffAccountId}
            onSelect={onSelectStaff}
            pending={pending}
            accountId={accountId}
            onReason={onReason}
          />
          {needsPassword && staffAccountId && (
            <p role="status" className={cardHintClass}>
              Nhân viên cần dùng chức năng Quên mật khẩu để thiết lập mật khẩu trước khi đăng nhập.
            </p>
          )}
          <form onSubmit={onAssignStaff} className="flex flex-col gap-3">
            <label className={labelClass}>
              Nhân viên đã chuẩn bị
              <Input
                className="font-normal"
                readOnly
                value={staffAccountLabel}
                placeholder="Chọn nhân viên trong danh bạ"
              />
            </label>
            <input type="hidden" name="staffAccountId" value={staffAccountId} />
            <Button
              type="submit"
              variant="outline"
              className="self-start"
              disabled={pending || !bookingId.trim() || !staffAccountId}
            >
              Phân công vào tiệc hiện tại
            </Button>
            {!bookingId.trim() && (
              <p className={cardHintClass}>Chọn tiệc ở đầu trang trước khi phân công.</p>
            )}
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">
            Danh sách phân công của tiệc ({assignments.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            disabled={loadingAssignments || !bookingId.trim()}
            onClick={() => void onLoadAssignments()}
          >
            <RefreshCw
              aria-hidden
              className={cn('size-3.5', loadingAssignments && 'motion-safe:animate-spin')}
            />
            {loadingAssignments ? 'Đang tải…' : 'Làm mới'}
          </Button>
        </div>
        {!bookingId ? (
          <p className={cardHintClass}>Chọn tiệc để xem phân công.</p>
        ) : assignmentError ? (
          <p role="alert" className="text-sm text-destructive">
            {assignmentError}
          </p>
        ) : loadingAssignments || !assignmentsReady ? (
          <p role="status" className={cardHintClass}>
            Đang tải phân công…
          </p>
        ) : assignments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-input px-6 py-8 text-center text-muted-foreground">
            Chưa có nhân sự nào được phân công cho tiệc này.
          </p>
        ) : (
          <AssignmentsTable
            assignments={assignments}
            pending={pending}
            onRevokeAssignment={onRevokeAssignment}
          />
        )}
      </div>
    </section>
  );
}
