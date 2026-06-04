"use client";

import { FormEvent, useState } from "react";
import { Mail, MapPin, Phone, Timer } from "lucide-react";
import { PageHero } from "@/components/page-hero";

export default function ContactPage() {
  const [status, setStatus] = useState("");

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim() || "Website enquiry";
    const message = String(formData.get("message") ?? "").trim();

    if (!name || !email || !message) {
      setStatus("Please enter your name, email, and message before submitting.");
      return;
    }

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      "Message:",
      message,
    ].join("\n");

    window.location.href = `mailto:sales@madhugarments.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus("Your email app is opening with the message addressed to MADHU GARMENTS.");
  };

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
          FOR PRODUCT ENQUIRIES, BULK ORDERS, SHIPPING SUPPORT, OR SERVICE QUESTIONS, SEND US A
          MESSAGE AND OUR TEAM WILL GET BACK TO YOU.
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
                <p>State: Tamil Nadu</p>
                <p>PIN Code: 641602</p>
                <p>GST : 33CFEPM5936E1ZJ</p>
                <p>UDYAM REG : UDYAM-TN-28-0018044</p>
              </span>
            </div>
            <div>
              <Phone />
              <span>
                <h3>Phone</h3>
                <p>Mobile : +91 7845414129</p>
                <p>E-mail: sales@madhugarments.com</p>
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
                <p>sales@madhugarments.com</p>
              </span>
            </div>
          </aside>
          <form className="contact-form" onSubmit={handleContactSubmit}>
            <h3>Drop us a line</h3>
            <div className="form-row">
              <label>
                Name*
                <input name="name" placeholder="Your name" required />
              </label>
              <label>
                Email*
                <input name="email" placeholder="your@email.com" required type="email" />
              </label>
            </div>
            <label>
              Subject
              <input name="subject" placeholder="Bulk order, product enquiry, shipping support..." />
            </label>
            <label>
              Message*
              <textarea name="message" placeholder="Tell us what you need, quantity, destination city, or product details." required />
            </label>
            {status ? <p className="contact-status">{status}</p> : null}
            <button type="submit">Submit</button>
          </form>
        </div>
      </section>
    </main>
  );
}
