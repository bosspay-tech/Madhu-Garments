"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/auth-service";

type AuthMode = "login" | "signup";

type EmailOtpAuthFormProps = {
  mode: AuthMode;
};

function formatIndianPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");

  if (!cleaned) return "";
  if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.length === 10) return `+91${cleaned}`;

  return `+${cleaned}`;
}

function isValidIndianPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 10 || (cleaned.startsWith("91") && cleaned.length === 12);
}

function isValidOtp(otp: string) {
  return /^\d{6,8}$/.test(otp.trim());
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function EmailOtpAuthForm({ mode }: EmailOtpAuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    phone: false,
    otp: false,
  });
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const fullNameErr = useMemo(() => {
    if (!isSignup || !touched.fullName) return "";
    if (!fullName.trim()) return "Full name is required.";
    return "";
  }, [fullName, isSignup, touched.fullName]);

  const emailErr = useMemo(() => {
    if (!touched.email) return "";
    if (!email.trim()) return "Email is required.";
    if (!isValidEmail(email)) return "Please enter a valid email address.";
    return "";
  }, [email, touched.email]);

  const phoneErr = useMemo(() => {
    if (!touched.phone) return "";
    if (!phone.trim()) return "Phone number is required.";
    if (!isValidIndianPhone(phone)) return "Please enter a valid 10-digit mobile number.";
    return "";
  }, [phone, touched.phone]);

  const otpErr = useMemo(() => {
    if (!otpSent || !touched.otp) return "";
    if (!otp.trim()) return "OTP is required.";
    if (!isValidOtp(otp)) return "Please enter a valid OTP.";
    return "";
  }, [otp, otpSent, touched.otp]);

  const canSendOtp =
    !sendingOtp &&
    (!isSignup || !!fullName.trim()) &&
    !!email.trim() &&
    !!phone.trim() &&
    !fullNameErr &&
    !emailErr &&
    !phoneErr;
  const canVerifyOtp =
    otpSent &&
    !verifyingOtp &&
    (!isSignup || !!fullName.trim()) &&
    !!email.trim() &&
    !!phone.trim() &&
    !!otp.trim() &&
    !fullNameErr &&
    !emailErr &&
    !phoneErr &&
    !otpErr;

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setTouched((current) => ({ ...current, fullName: true, email: true, phone: true }));

    if ((isSignup && !fullName.trim()) || !email.trim() || !isValidEmail(email) || !phone.trim() || !isValidIndianPhone(phone)) {
      setFormError(
        isSignup
          ? "Please enter your full name, valid email address, and valid mobile number."
          : "Please enter a valid email address and mobile number.",
      );
      return;
    }

    setSendingOtp(true);
    try {
      const formattedPhone = formatIndianPhone(phone);
      const { error } = await sendEmailOtp({
        email: email.trim(),
        phone: formattedPhone,
        fullName: isSignup ? fullName.trim() : "",
      });

      if (error) {
        setFormError(error.message || "Failed to send OTP. Please try again.");
        return;
      }

      setOtpSent(true);
      setOtp("");
      setTouched((current) => ({ ...current, otp: false }));
      setSuccessMessage(`OTP sent to ${email.trim()}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong while sending OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setTouched((current) => ({ ...current, fullName: true, email: true, phone: true, otp: true }));

    if (
      (isSignup && !fullName.trim()) ||
      !email.trim() ||
      !isValidEmail(email) ||
      !phone.trim() ||
      !isValidIndianPhone(phone) ||
      !otp.trim() ||
      !isValidOtp(otp)
    ) {
      setFormError(
        isSignup
          ? "Please complete your name, email, valid mobile number, and OTP."
          : "Please enter a valid email address, mobile number, and OTP.",
      );
      return;
    }

    setVerifyingOtp(true);
    try {
      const formattedPhone = formatIndianPhone(phone);
      const { error } = await verifyEmailOtp({
        email: email.trim(),
        token: otp.trim(),
        phone: formattedPhone,
        fullName: isSignup ? fullName.trim() : "",
      });

      if (error) {
        setFormError(error.message || "OTP verification failed. Please try again.");
        return;
      }

      setSuccessMessage(
        isSignup
          ? "Account created successfully with your email and mobile number. You are now logged in."
          : "OTP verified successfully. You are now logged in with your email and mobile number.",
      );
      router.replace("/");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong while verifying OTP. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-card-header">
            <div>
              <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>
              <p>
                {isSignup
                  ? "Sign up with your name, email, mobile number, and verify your email using OTP."
                  : "Sign in with your email address and one-time password"}
              </p>
            </div>
            <span>{isSignup ? "Email OTP Signup" : "Email OTP Login"}</span>
          </div>

          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
            {formError ? <div className="auth-alert error">{formError}</div> : null}
            {successMessage ? <div className="auth-alert success">{successMessage}</div> : null}

            {isSignup ? (
              <label>
                Full Name
                <input
                  autoComplete="name"
                  className={fullNameErr ? "invalid" : ""}
                  disabled={sendingOtp || verifyingOtp}
                  onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  type="text"
                  value={fullName}
                />
                <small className={fullNameErr ? "field-error" : ""}>
                  {fullNameErr || "Enter the name you want to use for your account."}
                </small>
              </label>
            ) : null}

            <label>
              Email Address
              <input
                autoComplete="email"
                className={emailErr ? "invalid" : ""}
                disabled={sendingOtp || verifyingOtp}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
              <small className={emailErr ? "field-error" : ""}>
                {emailErr || (isSignup ? "We will use this email for account communication." : "Enter the email linked to your account.")}
              </small>
            </label>

            <label>
              Mobile Number
              <input
                autoComplete="tel"
                className={phoneErr ? "invalid" : ""}
                disabled={sendingOtp || verifyingOtp}
                onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="9876543210"
                type="tel"
                value={phone}
              />
              <small className={phoneErr ? "field-error" : ""}>
                {phoneErr || "Enter your 10-digit number. We will automatically use +91."}
              </small>
            </label>

            {otpSent ? (
              <label>
                <span className="otp-label-row">
                  Enter OTP
                  <button disabled={sendingOtp || verifyingOtp} onClick={handleSendOtp} type="button">
                    {sendingOtp ? "Resending..." : "Resend OTP"}
                  </button>
                </span>
                <input
                  autoComplete="one-time-code"
                  className={otpErr ? "invalid" : ""}
                  disabled={verifyingOtp}
                  inputMode="numeric"
                  maxLength={8}
                  onBlur={() => setTouched((current) => ({ ...current, otp: true }))}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  placeholder="Enter OTP"
                  type="text"
                  value={otp}
                />
                <small className={otpErr ? "field-error" : ""}>{otpErr || "Enter the code sent to your email address."}</small>
              </label>
            ) : null}

            <button className="auth-submit" disabled={otpSent ? !canVerifyOtp : !canSendOtp} type="submit">
              {otpSent
                ? verifyingOtp
                  ? "Verifying OTP..."
                  : isSignup
                    ? "Verify OTP & Sign Up"
                    : "Verify OTP"
                : sendingOtp
                  ? "Sending OTP..."
                  : "Send OTP"}
            </button>

            <p className="auth-switch">
              {isSignup ? "Already have an account?" : "New here?"}{" "}
              <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link>
            </p>

            <p className="auth-terms">
              {isSignup ? "By creating an account" : "By continuing"}, you agree to our <span>Terms</span> & <span>Privacy Policy</span>.
            </p>
          </form>
        </div>

        <div className="auth-trust">
          <span>{isSignup ? "Secure" : "Encrypted"}</span>
          <span>Fast checkout</span>
          <span>Trusted</span>
        </div>
      </div>
    </section>
  );
}
