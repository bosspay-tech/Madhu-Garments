import type { Metadata } from "next";
import { EmailOtpAuthForm } from "@/components/email-otp-auth-form";

export const metadata: Metadata = {
  title: "Login | MADHU GARMENTS",
};

export default function LoginPage() {
  return <EmailOtpAuthForm mode="login" />;
}
