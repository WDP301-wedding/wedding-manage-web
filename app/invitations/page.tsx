"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createIdentityApi, ManagementIdentitySession } from "@/src/features/identity-access/session";
import { createManagerInvitationGateway } from "@/src/features/invitation-studio/manager-invitation-api";
import { ManagerInvitationView } from "@/src/features/invitation-studio/manager-invitation-view";

const session = new ManagementIdentitySession(createIdentityApi());
const gateway = createManagerInvitationGateway();

export default function InvitationsManagementPage() {
  const [state, setState] = useState<"loading" | "authenticated" | "anonymous">("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void session.restore().then(async (snapshot) => {
      if (!active) return;
      if (snapshot.status === "anonymous") {
        setState("anonymous");
      } else {
        try {
          const accessToken = await session.authorize((tok) => Promise.resolve(tok));
          if (!active) return;
          setToken(accessToken);
          setState("authenticated");
        } catch {
          if (!active) return;
          setState("anonymous");
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-8">
        <p className="text-stone-600">Đang xác minh phiên làm việc Quản lý…</p>
      </main>
    );
  }

  if (state === "anonymous" || !token) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-8">
        <div className="bg-white p-6 rounded-lg shadow-sm max-w-md text-center">
          <h1 className="text-xl font-serif text-stone-900 mb-2">Yêu cầu đăng nhập</h1>
          <p className="text-sm text-stone-600 mb-4">
            Vui lòng đăng nhập với quyền Quản lý hoặc Nhân viên để truy cập tính năng Thiệp cưới.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-stone-900 text-white rounded text-sm hover:bg-stone-800 transition"
          >
            Đến trang đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <ManagerInvitationView accessToken={token} gateway={gateway} />
    </main>
  );
}
