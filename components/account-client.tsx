"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth-service";
import { AccountMenu } from "@/components/account-menu";
import { useAuth } from "@/components/use-auth";
import { getSupabase } from "@/lib/supabase";

export function AccountClient() {
  const { configured, loading, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const fullName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const phone = typeof user?.user_metadata?.phone === "string" ? user.user_metadata.phone : "";
  const displayName = fullName || user?.email || "customer";

  // Check admin status
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let alive = true;
    const checkAdmin = async () => {
      try {
        const { data: { session }, error } = await getSupabase().auth.getSession();
        if (error || !session?.access_token) return;

        const res = await fetch("/api/admin/check", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const json = await res.json();
        if (alive && json.success) {
          setIsAdmin(json.isAdmin);
        }
      } catch (err) {
        console.error("Failed to check admin status:", err);
      }
    };

    checkAdmin();
    return () => {
      alive = false;
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  if (!configured) {
    return (
      <div className="account-panel">
        <h2>Connect Supabase</h2>
        <p>Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to enable email OTP login.</p>
        <div className="account-actions">
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign up</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="account-panel">
        <p>Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-panel">
        <h2>Access your account</h2>
        <p>Login or create your MADHU GARMENTS account using email OTP authentication.</p>
        <div className="account-actions">
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign up</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <AccountMenu active="dashboard" />
      <div className="account-panel">
        {isAdmin && (
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "6px", padding: "12px 15px", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#92400e", fontWeight: "bold" }}>
              Logged in as Administrator
            </span>
            <Link href="/admin" style={{ background: "#b45309", color: "white", padding: "4px 10px", borderRadius: "4px", fontSize: "12px", textDecoration: "none", fontWeight: "bold" }}>
              Admin Panel
            </Link>
          </div>
        )}
        <p>
          Hello <strong>{displayName}</strong> (not <strong>{displayName}</strong>?{" "}
          <button onClick={handleSignOut} type="button">
            Log out
          </button>
          )
        </p>
        <p>
          From your account dashboard you can view your recent orders and review the contact details linked to your
          MADHU GARMENTS account.
        </p>

        <div className="account-details-grid">
          <div>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          {phone ? (
            <div>
              <span>Mobile</span>
              <strong>{phone}</strong>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
