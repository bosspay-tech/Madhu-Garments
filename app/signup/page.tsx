import type { Metadata } from "next";
import { EmailOtpAuthForm } from "@/components/email-otp-auth-form";

export const metadata: Metadata = {
  title: "Sign up | MADHU GARMENTS",
};

export default function SignupPage() {
  return <EmailOtpAuthForm mode="signup" />;
}
