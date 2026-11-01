'use client';

import type { FormEvent } from 'react';
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
  selectClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from './staff-classes';

export interface StaffManagementSectionProps {
  bookingId: string;
  staffAccountId: string;
  setStaffAccountId: (id: string) => void;
  pending: boolean;
  assignments: readonly EventAssignmentItem[];
  loadingAssignments: boolean;
  onLoadAssignments: () => Promise<void>;
  onProvisionStaff: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onAssignStaff: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onRevokeAssignment: (assignmentId: string) => Promise<void>;
}

function AssignmentsTable({
  assignments,
  pending,
  onRevokeAssignment,
}: Readonly<{
  assignments: readonly EventAssignmentItem[];
  pending: boolean;
  onRevokeAssignment: (assignmentId: string) => Promise<void>;
}>) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead className="bg-muted">
          <tr>
            <th className={thClass}>Mã nhân viên</th>
            <th className={thClass}>Trạng thái</th>
            <th className={thClass}>Phiên bản</th>
            <th className={cn(thClass, 'text-right')}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((item) => (
            <tr key={item.assignmentId} className="border-t border-border">
              <td className={tdClass}>
                <code className="font-mono text-xs break-all">{item.staffAccountId}</code>
              </td>
              <td className={tdClass}>
                {item.status === 'ACTIVE' ? (
                  <Badge variant="success">Đang hoạt động</Badge>
                ) : (
                  <Badge variant="neutral">Đã thu hồi</Badge>
                )}
              </td>
              <td className={cn(tdClass, 'tabular-nums')}>{item.revision}</td>
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
  setStaffAccountId,
  pending,
  assignments,
  loadingAssignments,
  onLoadAssignments,
  onProvisionStaff,
  onAssignStaff,
  onRevokeAssignment,
}: Readonly<StaffManagementSectionProps>) {
  return (
    <section aria-label="Tài khoản và phân công nhân sự" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-6">
        <div className={cn(cardClass, 'flex-[1_1_380px]')}>
          <div className="flex flex-col gap-0.5">
            <h3 className={cardTitleClass}>Cấp tài khoản Staff mới</h3>
            <p className={cardHintClass}>
              Tạo tài khoản nhân viên vận hành sảnh để phân công công việc.
            </p>
          </div>
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
            <label className={labelClass}>
              Họ và tên hiển thị
              <Input
                className="font-normal"
                name="displayName"
                required
                placeholder="Nguyễn Văn A"
              />
            </label>
            <label className={labelClass}>
              Số điện thoại (tuỳ chọn)
              <Input className="font-normal" name="phone" type="tel" placeholder="0901234567" />
            </label>
            <Button type="submit" className="self-start" disabled={pending}>
              Cấp tài khoản
            </Button>
          </form>
        </div>

        <div className={cn(cardClass, 'flex-[1_1_380px]')}>
          <div className="flex flex-col gap-0.5">
            <h3 className={cardTitleClass}>Phân công nhân sự vào tiệc</h3>
            <p className={cardHintClass}>Giao quyền đón khách hoặc điều phối tiệc cho nhân viên.</p>
          </div>
          <form onSubmit={onAssignStaff} className="flex flex-col gap-3">
            <label className={labelClass}>
              Mã tài khoản nhân sự
              <Input
                className="font-normal"
                name="staffAccountId"
                required
                value={staffAccountId}
                onChange={(e) => setStaffAccountId(e.target.value)}
                placeholder="Mã tài khoản nhân viên"
              />
            </label>
            <label className={labelClass}>
              Vai trò phân công
              <select name="roleCode" defaultValue="CHECK_IN" className={selectClass}>
                <option value="CHECK_IN">Đón khách &amp; Check-in</option>
                <option value="COORDINATOR">Điều phối chương trình</option>
                <option value="GENERAL_SUPPORT">Hỗ trợ chung</option>
              </select>
            </label>
            <Button
              type="submit"
              variant="outline"
              className="self-start"
              disabled={pending || !bookingId.trim()}
            >
              Phân công vào tiệc hiện tại
            </Button>
            {!bookingId.trim() && (
              <p className={cardHintClass}>Nhập mã tiệc ở tab Đón khách &amp; Check-in trước.</p>
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
        {assignments.length === 0 ? (
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
