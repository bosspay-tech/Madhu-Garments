import { Mail, MapPin, Phone, Timer } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default function ContactPage() {
  return (
    <main>
      <PageHero title="Contact Us" plain />
      <section className="contact-map container">
        <iframe
          title="MADHU GARMENTS map"
          src="https://www.google.com/maps?q=Floor%20No.%202nd%20Floor%2C%2060%20Feet%20Road%20PN%20Road%2C%201st%20Street%2C%20Kumarnathapuram%2C%20Tiruppur%2C%20Tamil%20Nadu%2C%20641602&output=embed"
          loading="lazy"
        />
      </section>
      <section className="contact-section container">
        <h2>Get in touch with us</h2>
        <p className="contact-kicker">
          FOR MORE INFORMATION ABOUT OUR PRODUCT & SERVICES, PLEASE FEEL FREE TO DROP US AN EMAIL.
          OUR STAFF ALWAYS BE THERE TO HELP YOU OUT. DO NOT HESITATE!
        </p>
        <div className="contact-grid">
          <aside className="contact-details">
            <div>
              <MapPin />
              <span>
                <h3>Address</h3>
                <p>MADHU GARMENTS</p>
                <p>Floor No.2nd Floor</p>
                <p>Road/Street: 60 Feet Road PN Road ,1st Street</p>
                <p>Locality: Kumarnathapuram</p>
                <p>City/Town/Village: Tiruppur</p>
                <p>District: Tiruppur</p>
                <p>State : Thamilnadu</p>
                <p>PIN Code: 641602</p>
                <p>GST : 33CFEPM5936E1ZJ</p>
                <p>UDYAM REG : UDYAM-TN-28-0018044</p>
              </span>
            </div>
            <div>
              <Phone />
              <span>
                <h3>Phone</h3>
                <p>Mobile : Contact store</p>
                <p>E-mail: madhu.garments@example.com</p>
              </span>
            </div>
            <div>
              <Timer />
              <span>
                <h3>Working Time</h3>
                <p>Monday - Friday: 10:00 - 18:00</p>
                <p>Saturday : 12:00 - 17:00</p>
              </span>
            </div>
            <div>
              <Mail />
              <span>
                <h3>Mail</h3>
                <p>madhu.garments@example.com</p>
              </span>
            </div>
          </aside>
          <form className="contact-form">
            <h3>Drop us a line</h3>
            <div className="form-row">
              <label>
                Name*
                <input placeholder="John Doe" />
              </label>
              <label>
                Email*
                <input placeholder="your@email.com" />
              </label>
            </div>
            <label>
              Subject
              <input placeholder="This is an optional" />
            </label>
            <label>
              Message*
              <textarea placeholder="Hi! I'd like to ask about..." />
            </label>
            <button type="button">Submit</button>
          </form>
        </div>
      </section>
    </main>
  );
}
