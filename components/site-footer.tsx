import Link from "next/link";

const address = [
  "MADHU GARMENTS",
  "Floor No.2nd Floor",
  "Road/Street: 60 Feet Road PN Road ,1st Street",
  "Locality: Kumarnathapuram",
  "City/Town/Village: Tiruppur",
  "District: Tiruppur",
  "State : Thamilnadu",
  "PIN Code: 641602",
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid container">
        <div>
          <Link className="footer-logo brand-logo footer-image-logo" href="/" aria-label="MADHU GARMENTS home">
            Madhu
            <small>GARMENTS</small>
          </Link>
          <address>
            {address.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
          <small>GST : 33CFEPM5936E1ZJ</small>
          <small>UDYAM REG : UDYAM-TN-28-0018044</small>
        </div>
        <div>
          <h3>Navigate</h3>
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/about-us">About Us</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div>
          <h3>Informations</h3>
          <a href="#">Terms & Conditions</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Refund and Returns Policy</a>
          <a href="#">Shipping Policy</a>
        </div>
        <div className="newsletter">
          <h3>Newsletter</h3>
          <p>Subscribe to get notified about product launches, special offers and news.</p>
          <input placeholder="madhu.garments@example.com" />
          <button>Subscribe</button>
        </div>
      </div>
      <div className="copyright container">MADHU GARMENTS 2026. All Rights Reserved.</div>
    </footer>
  );
}
