// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "대시보드", href: "/" },
  { name: "PDF 업로드 (신규)", href: "/upload" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 min-h-screen text-slate-300 flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center justify-center border-b border-slate-800">
        <h1 className="text-white font-bold tracking-widest text-lg">TEST GENERATOR</h1>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        © 2026 Admin Workspace
      </div>
    </aside>
  );
}