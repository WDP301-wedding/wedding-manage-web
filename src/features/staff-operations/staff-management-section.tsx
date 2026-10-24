'use client';

import type { FormEvent } from 'react';
import type { EventAssignmentItem } from '../../services/staff.service';
import { staffStyles } from './staff.styles';

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
    <section aria-labelledby="staff-admin-title">
      <div style={staffStyles.adminGrid}>
        {/* Form 1: Cấp tài khoản nhân sự */}
        <div style={staffStyles.adminCard}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Cấp tài khoản Staff mới</h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Tạo tài khoản nhân viên vận hành sảnh để phân công công việc.
          </p>

          <form onSubmit={onProvisionStaff} style={staffStyles.formColumn}>
            <div style={staffStyles.formGroup}>
              <label style={staffStyles.fieldLabel}>Email nhân viên</label>
              <input
                name="email"
                type="email"
                required
                placeholder="staff.name@example.com"
                style={staffStyles.input}
              />
            </div>

            <div style={staffStyles.formGroup}>
              <label style={staffStyles.fieldLabel}>Họ và tên hiển thị</label>
              <input
                name="displayName"
                type="text"
                required
                placeholder="Nguyễn Văn A"
                style={staffStyles.input}
              />
            </div>

            <div style={staffStyles.formGroup}>
              <label style={staffStyles.fieldLabel}>Số điện thoại (tuỳ chọn)</label>
              <input name="phone" type="tel" placeholder="0901234567" style={staffStyles.input} />
            </div>

            <button
              type="submit"
              disabled={pending}
              style={{
                marginTop: '0.5rem',
                padding: '0.625rem',
                background: '#111827',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: pending ? 'not-allowed' : 'pointer',
              }}
            >
              Cấp tài khoản
            </button>
          </form>
        </div>

        {/* Form 2: Phân công tiệc */}
        <div style={staffStyles.adminCard}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Phân công nhân sự vào tiệc
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Giao quyền đón khách hoặc điều phối tiệc cho nhân viên.
          </p>

          <form onSubmit={onAssignStaff} style={staffStyles.formColumn}>
            <div style={staffStyles.formGroup}>
              <label style={staffStyles.fieldLabel}>Mã tài khoản nhân sự (staffAccountId)</label>
              <input
                name="staffAccountId"
                type="text"
                required
                value={staffAccountId}
                onChange={(e) => setStaffAccountId(e.target.value)}
                placeholder="UUID tài khoản nhân viên"
                style={staffStyles.input}
              />
            </div>

            <div style={staffStyles.formGroup}>
              <label style={staffStyles.fieldLabel}>Vai trò phân công</label>
              <select name="roleCode" defaultValue="CHECK_IN" style={{ width: '100%' }}>
                <option value="CHECK_IN">Đón khách &amp; Check-in (CHECK_IN)</option>
                <option value="COORDINATOR">Điều phối chương trình (COORDINATOR)</option>
                <option value="GENERAL_SUPPORT">Hỗ trợ chung (GENERAL_SUPPORT)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={pending || !bookingId.trim()}
              style={{
                marginTop: '0.5rem',
                padding: '0.625rem',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: pending || !bookingId.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Phân công vào tiệc hiện tại
            </button>
          </form>
        </div>
      </div>

      {/* Bảng phân công hiện tại của booking */}
      <div
        style={{
          marginTop: '2rem',
          background: '#fff',
          padding: '1.5rem',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
        }}
      >
        <div style={staffStyles.adminCardHeader}>
          <h3 style={{ fontSize: '1.125rem' }}>
            Danh sách phân công của tiệc ({assignments.length})
          </h3>
          <button
            type="button"
            disabled={loadingAssignments || !bookingId.trim()}
            onClick={() => void onLoadAssignments()}
            style={staffStyles.refreshButton(loadingAssignments || !bookingId.trim())}
          >
            {loadingAssignments ? 'Đang tải…' : 'Làm mới'}
          </button>
        </div>

        {assignments.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Chưa có nhân sự nào được phân công cho tiệc này.
          </p>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: '#f9fafb',
                    textAlign: 'left',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <th style={{ padding: '0.75rem' }}>Mã nhân viên (Account ID)</th>
                  <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                  <th style={{ padding: '0.75rem' }}>Phiên bản (Revision)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.assignmentId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <code>{item.staffAccountId}</code>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: item.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                          color: item.status === 'ACTIVE' ? '#065f46' : '#991b1b',
                        }}
                      >
                        {item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã thu hồi'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      REV {item.revision}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {item.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => void onRevokeAssignment(item.assignmentId)}
                          style={staffStyles.revokeButton(pending)}
                        >
                          Thu hồi
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
