import { PageHero } from "@/components/page-hero";

export default function AboutPage() {
  return (
    <main>
      <PageHero title="About Us" />
      <section className="about-intro container">
        <img src="/girlwithsareeforaboutus.png" alt="MADHU GARMENTS bridal clothing" />
        <div>
          <h2>WELCOME TO MADHU GARMENTS (TAMIL NADU)</h2>
          <p>
            Welcome to <strong>MADHU GARMENTS</strong>, a premium clothing brand from
            Tiruppur, Tamil Nadu, dedicated to redefining style, comfort, and quality for modern
            India.
          </p>
          <p>
            At MADHU GARMENTS, fashion is more than just clothing. It is an expression of
            elegance, confidence, and personality, shaped through thoughtfully designed apparel and
            careful craftsmanship.
          </p>
        </div>
      </section>

      <section className="story-band">
        <div className="story-grid container">
          <div>
            <h2>OUR STORY</h2>
            <p>
              MADHU GARMENTS was born with a simple idea:
              <strong> to offer high-quality, stylish clothing that blends luxury with affordability.</strong>
            </p>
            <p>
              From curated everyday wear to standout fashion pieces, our brand celebrates modern
              trends while keeping comfort at the center.
            </p>
          </div>
          <img src="/maninredbackgroundforaboutus.png" alt="Menswear collection" />
          <img src="/girlindrygrassfieldforaboutus.png" alt="Women collection" />
        </div>
      </section>

      <section className="offer-section container">
        <h2>WHAT WE OFFER</h2>
        <ul>
          <li>Premium-quality clothing for men & women</li>
          <li>Trendy, timeless, and comfortable designs</li>
          <li>Superior fabric selection</li>
          <li>Perfect tailoring and finishing</li>
          <li>Affordable luxury apparel</li>
        </ul>
      </section>

      <section className="business-details container">
        <h2>BUSINESS DETAILS</h2>
        <p>
          <strong>MADHU GARMENTS</strong>
        </p>
        <p>Floor No.2nd Floor</p>
        <p>Road/Street: 60 Feet Road PN Road ,1st Street</p>
        <p>Locality: Kumarnathapuram</p>
        <p>City/Town/Village: Tiruppur</p>
        <p>District: Tiruppur</p>
        <p>State : Thamilnadu</p>
        <p>PIN Code: 641602</p>
        <p>GST : 33CFEPM5936E1ZJ</p>
        <p>UDYAM REG : UDYAM-TN-28-0018044</p>
      </section>

      <section className="mission-grid container">
        <div>
          <h2>OUR VISION</h2>
          <p>To become a globally recognized fashion brand known for luxury, innovation, and premium-quality clothing.</p>
        </div>
        <div>
          <h2>OUR MISSION</h2>
          <p>To deliver stylish, comfortable, and affordable apparel that elevates everyday fashion experiences.</p>
        </div>
      </section>
    </main>
  );
}
