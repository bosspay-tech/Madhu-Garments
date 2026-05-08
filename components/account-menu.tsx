"use client";

import Link from "next/link";
import { ClipboardList, Gauge, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-service";

type AccountMenuProps = {
  active: "dashboard" | "orders";
};

const menu = [
  { href: "/my-account", label: "Dashboard", icon: Gauge, key: "dashboard" },
  { href: "/orders", label: "Orders", icon: ClipboardList, key: "orders" },
] as const;

export function AccountMenu({ active }: AccountMenuProps) {
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="account-menu">
      {menu.map(({ href, label, icon: Icon, key }) => (
        <Link className={active === key ? "active" : ""} href={href} key={href}>
          <Icon size={23} />
          {label}
        </Link>
      ))}
      <button onClick={handleSignOut} type="button">
        <LogOut size={23} />
        Log out
      </button>
    </nav>
  );
}
