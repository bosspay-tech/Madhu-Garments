import { ClipboardList, Gauge, Heart, LogOut, Map, UserRound } from "lucide-react";
import { PageHero } from "@/components/page-hero";

const menu = [
  ["Dashboard", Gauge],
  ["Orders", ClipboardList],
  ["Addresses", Map],
  ["Account details", UserRound],
  ["Wishlist", Heart],
  ["Log out", LogOut],
] as const;

export default function AccountPage() {
  return (
    <main>
      <PageHero title="My account" />
      <section className="account-wrap container">
        <nav className="account-menu">
          {menu.map(([label, Icon], index) => (
            <a href="#" className={index === 0 ? "active" : ""} key={label}>
              <Icon size={23} />
              {label}
            </a>
          ))}
        </nav>
        <div className="account-panel">
          <p>
            Hello <strong>admin</strong> (not <strong>admin</strong>? Log out)
          </p>
          <p>
            From your account dashboard you can view your recent orders, manage your shipping and
            billing addresses, and edit your password and account details.
          </p>
          <div className="signup-otp-panel">
            <h2>Sign up with OTP</h2>
            <p>Create your MADHU GARMENTS account using your mobile number and one-time password.</p>
            <form>
              <label>
                Mobile number
                <input inputMode="tel" placeholder="Enter mobile number" />
              </label>
              <label>
                OTP
                <input inputMode="numeric" placeholder="Enter OTP" />
              </label>
              <div>
                <button type="button">Send OTP</button>
                <button type="button">Verify & Sign Up</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
