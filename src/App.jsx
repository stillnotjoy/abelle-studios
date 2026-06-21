import { useEffect, useMemo, useState } from "react";

const messengerLink = "https://m.me/254698671071327";
const phoneNumber = "+63 993 009 4179";
const phoneLink = "tel:+639930094179";
const mapLink =
  "https://maps.google.com/?q=RM+208+2nd+Floor+E.I.+Building+Calle+II+de+Febrero+Tradetown+Funda-Dalipe+San+Jose+Antique";

const socialLinks = [
  { name: "Phone", label: phoneNumber, href: phoneLink, icon: "phone" },
  {
    name: "Facebook",
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=254698671071327",
    icon: "facebook",
  },
  { name: "Messenger", label: "Messenger", href: messengerLink, icon: "messenger" },
  {
    name: "Instagram",
    label: "@abellestudios_antq",
    href: "https://www.instagram.com/abellestudios_antq",
    icon: "instagram",
  },
  {
    name: "TikTok",
    label: "@abellestudios_antq",
    href: "https://www.tiktok.com/@abellestudios_antq",
    icon: "tiktok",
  },
];

const packages = [
  {
    id: "01",
    title: "Personal Portraits",
    tag: "Solo Session",
    desc: "Perfect for solo portraits, creative portraits, professional photos, or simply capturing your own moment.",
    image: "/assets/personal.jpg",
    price: "₱499",
    inclusions: [
      "30–45 minute guided photoshoot",
      "1 chosen portrait in A4 print",
      "2 wallet-size copies",
      "Enhanced soft copies sent via email",
      "Professional studio background",
      "Professional makeup and styling available",
      "Costume of choice available by request",
    ],
  },
  {
    id: "02",
    title: "Duo Portraits",
    tag: "Two’s Company",
    desc: "Perfect for couples, best friends, siblings, or two-person studio portraits.",
    image: "/assets/duo.jpg",
    price: "₱899",
    inclusions: [
      "30–45 minute guided photoshoot",
      "1 chosen portrait in A4 print",
      "2 4R copies",
      "2 wallet-size copies",
      "Enhanced soft copies sent via email",
      "Professional studio background",
      "Professional makeup and styling available",
      "Costume of choice available by request",
    ],
  },
  {
    id: "03",
    title: "Barkada Shoot",
    tag: "Squad Goals",
    desc: "Perfect for birthdays, school friends, barkada memories, or fun studio moments with friends.",
    image: "/assets/barkada.jpg",
    price: "₱999",
    inclusions: [
      "Good for 3–4 people",
      "30–45 minute photoshoot",
      "Professional studio background and lighting",
      "1 chosen shot in A4 print",
      "2 4R copies or 6 wallet-size copies",
      "Soft copies sent via email",
    ],
  },
  {
    id: "04",
    title: "Family Portrait",
    tag: "Together",
    desc: "Ideal for family gatherings, birthdays, holidays, milestones, or simply capturing a special moment with loved ones.",
    image: "/assets/family.jpg",
    price: "₱1,299",
    inclusions: [
      "Good for 5–6 people",
      "45–60 minute photoshoot",
      "2 chosen portraits in A4 print",
      "2 4R copies",
      "2 wallet-size copies",
      "Soft copies sent via email",
      "Professional studio background",
      "Photo album available by request",
    ],
  },
];

const services = [
  "Family Portraits",
  "Personal Portraits",
  "Barkada Shoot",
  "Maternity Shoot",
  "Newborn Photoshoot",
  "Engagement Photoshoot",
  "Wedding & Pre-wedding Photoshoot",
  "Graduation Photoshoot",
  "Food / Product Photography",
  "Resume Headshots",
  "Rush ID Photos 2×2 & 1×1",
  "Special Event? Ask us!",
];


const whyUs = [
  "Affordable packages",
  "Guided posing",
  "Professional studio lighting",
  "Creative shoot concepts",
  "Comfortable studio space",
  "Perfect for all occasions",
];

const slideshowPhotos = [
  { src: "/assets/personal.jpg", position: "center 18%" },
  { src: "/assets/duo.jpg", position: "center 14%" },
  { src: "/assets/barkada.jpg", position: "center 38%" },
  { src: "/assets/family.jpg", position: "center 36%" },
  { src: "/assets/newborn.jpg", position: "center 28%" },
];

const bookingSlots = [
  { label: "9:00 AM", value: "09:00" },
  { label: "11:00 AM", value: "11:00" },
  { label: "1:00 PM", value: "13:00" },
  { label: "3:00 PM", value: "15:00" },
  { label: "5:00 PM", value: "17:00" },
];

const bookingPackages = packages.map((pkg) => ({
  id: pkg.id,
  title: pkg.title,
  price: pkg.price,
  desc: pkg.desc,
}));

function pesoToNumber(price) {
  return Number(String(price).replace(/[^\d]/g, ""));
}

function calculateBookingPayment(packagePrice, paymentOption) {
  const isFullOnline = paymentOption === "full_online";

  const amountDueToday = isFullOnline
    ? packagePrice
    : packagePrice <= 500
      ? packagePrice
      : Math.ceil(packagePrice * 0.5);

  const remainingBalance = packagePrice - amountDueToday;

  return {
    amountDueToday,
    remainingBalance,
  };
}

function SocialIcon({ type, size = 17 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
  };

  switch (type) {
    case "phone":
      return (
        <svg {...common}>
          <path
            d="M6.6 10.8c1.8 3.5 3.1 4.8 6.6 6.6l2.1-2.1c.4-.4.9-.5 1.4-.3 1 .3 2 .5 3.1.5.7 0 1.2.5 1.2 1.2v3.1c0 .7-.5 1.2-1.2 1.2C10.4 21 3 13.6 3 4.2 3 3.5 3.5 3 4.2 3h3.1c.7 0 1.2.5 1.2 1.2 0 1.1.2 2.1.5 3.1.1.5 0 1-.3 1.4l-2.1 2.1z"
            fill="currentColor"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path
            d="M14 8h2V5h-2c-2.8 0-4.5 1.7-4.5 4.5V12H7v3h2.5v6h3.2v-6h2.6l.5-3h-3.1V9.7c0-1.1.4-1.7 1.3-1.7z"
            fill="currentColor"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <path
            d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3zm0 2A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19h9a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 16.5 5h-9z"
            fill="currentColor"
          />
          <path
            d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm4.9-2.7a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z"
            fill="currentColor"
          />
        </svg>
      );
    case "messenger":
      return (
        <svg {...common}>
          <path
            d="M12 3C6.9 3 3 6.7 3 11.5c0 2.7 1.3 5.1 3.4 6.7V21l3.1-1.7c.8.2 1.6.3 2.5.3 5.1 0 9-3.7 9-8.5S17.1 3 12 3zm1 11.4-2.3-2.5-4.5 2.5 5-5.3 2.3 2.5 4.4-2.5-4.9 5.3z"
            fill="currentColor"
          />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path
            d="M15.2 3c.3 2.2 1.5 3.8 3.8 4.1v3c-1.4 0-2.7-.4-3.8-1.1v5.9c0 3.1-2.5 5.5-5.5 5.5s-5.4-2.4-5.4-5.4S6.7 9.6 9.7 9.6c.4 0 .7 0 1 .1V13c-.3-.2-.6-.2-1-.2-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-.9 2.2-2.2V3h3.3z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return null;
  }
}

function App() {
  const bookingStatus =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("booking")
      : null;

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    packageId: bookingPackages[0].id,
    date: "",
    time: "",
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [paymentOption, setPaymentOption] = useState("dp_gcash_balance_instudio");
  const [bookedTimes, setBookedTimes] = useState([]);
const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  const selectedBookingPackage =
    bookingPackages.find((pkg) => pkg.id === bookingForm.packageId) ||
    bookingPackages[0];

  const selectedPackagePrice = pesoToNumber(selectedBookingPackage.price);
  const paymentSummary = calculateBookingPayment(selectedPackagePrice, paymentOption);

  const fullPaymentAmount = selectedPackagePrice;

const dpAmount =
  selectedPackagePrice <= 500
    ? selectedPackagePrice
    : Math.ceil(selectedPackagePrice * 0.5);

const amountToPayNow =
  paymentOption === "full_online" ? fullPaymentAmount : dpAmount;

const remainingBalance =
  paymentOption === "full_online" ? 0 : selectedPackagePrice - dpAmount;

 const availableSlots = useMemo(() => {
  if (!bookingForm.date) return [];

  return bookingSlots.filter(
    (slot) => !bookedTimes.includes(slot.value)
  );
}, [bookingForm.date, bookedTimes]);

useEffect(() => {
  if (!bookingForm.date) {
    setBookedTimes([]);
    return;
  }

  const checkAvailableSlots = async () => {
    try {
      setIsCheckingSlots(true);

      setBookingForm((current) => ({
        ...current,
        time: "",
      }));

      const response = await fetch(`/api/available-slots?date=${bookingForm.date}`);
      const data = await response.json();

      if (!response.ok) {
        console.error(data);
        setBookedTimes([]);
        return;
      }

      setBookedTimes(data.bookedTimes || []);
    } catch (error) {
      console.error("Slot checking error:", error);
      setBookedTimes([]);
    } finally {
      setIsCheckingSlots(false);
    }
  };

  checkAvailableSlots();
}, [bookingForm.date]);

  const openMessenger = () => window.open(messengerLink, "_blank");
  const openCall = () => window.open(phoneLink);
  const openMaps = () => window.open(mapLink, "_blank");

  const openBookingDrawer = () => {
    setIsBookingOpen(true);
  };

  const closeBookingDrawer = () => {
    setIsBookingOpen(false);
  };

  const updateBookingForm = (event) => {
    const { name, value } = event.target;

    setBookingForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const choosePackageAndBook = (packageId) => {
    setBookingForm((current) => ({
      ...current,
      packageId,
    }));

    setIsBookingOpen(true);
  };
const submitBookingPreview = async (event) => {
  event.preventDefault();

  if (!bookingForm.time) {
    alert("Please choose an available time before continuing.");
    return;
  }

  try {
    const basePayload = {
      packageTitle: selectedBookingPackage.title,
      packagePrice: selectedPackagePrice,
      amountDueToday: paymentSummary.amountDueToday,
      remainingBalance: paymentSummary.remainingBalance,
      date: bookingForm.date,
      time: bookingForm.time,
      name: bookingForm.name,
      phone: bookingForm.phone,
      email: bookingForm.email,
      notes: bookingForm.notes,
      paymentOption,
    };

    if (paymentOption === "full_online") {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(basePayload),
      });

      const responseText = await response.text();

      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (error) {
        console.error("Non-JSON API response:", responseText);
        throw new Error("The checkout API did not return a valid response.");
      }

      if (!response.ok) {
        console.error("Checkout API error:", data);
        throw new Error(data.error || "Unable to create checkout.");
      }

      if (!data.checkoutUrl) {
        console.error("Missing checkoutUrl:", data);
        throw new Error("Checkout link was not created.");
      }

      window.location.href = data.checkoutUrl;
      return;
    }

    const response = await fetch("/api/create-booking-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...basePayload,
        paymentOption: "dp_gcash_balance_instudio",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      alert("Sorry, we could not submit your booking request. Please try again.");
      return;
    }

    window.location.href = `/?booking=requested&ref=${data.bookingReference}`;
  } catch (error) {
    console.error("Frontend checkout error:", error);
    alert(`Checkout error: ${error.message}`);
  }
};
if (bookingStatus === "requested") {
  const bookingReference =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("ref")
      : "";

  return (
    <main className="site">
      <style>{css}</style>

      <section className="thank-you-page">
        <div className="thank-you-card">
          <p className="eyebrow">Booking Request Received</p>
          <h1>Thank you. We received your booking request.</h1>
          <p>
            Your preferred slot has been submitted for review. We’ll send our
            GCash payment details shortly. Your booking is confirmed only once
            payment has been received.
          </p>

          {bookingReference && (
            <p>
              <strong>Reference:</strong> {bookingReference}
            </p>
          )}

          <div className="thank-you-actions">
            <a className="btn btn-dark" href="/">
              Back to Home
            </a>
            <a
              className="btn btn-outline"
              href="https://m.me/254698671071327"
              target="_blank"
              rel="noreferrer"
            >
              Message Us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
  if (bookingStatus === "success") {
    return (
      <main className="site">
        <style>{css}</style>

        <section className="thank-you-page">
          <div className="thank-you-card">
            <p className="eyebrow">Booking Confirmed</p>
            <h1>Thank you for booking with Abelle Studios.</h1>
            <p>
              Your payment has been received and your shoot is now confirmed.
              Please check your email for the full booking details and calendar
              options.
            </p>

            <div className="thank-you-actions">
              <a className="btn btn-dark" href="/">
                Back to Home
              </a>
              <a
                className="btn btn-outline"
                href="https://m.me/254698671071327"
                target="_blank"
                rel="noreferrer"
              >
                Message Us
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (bookingStatus === "cancelled") {
    return (
      <main className="site">
        <style>{css}</style>

        <section className="thank-you-page">
          <div className="thank-you-card">
            <p className="eyebrow">Payment Cancelled</p>
            <h1>Your booking was not completed.</h1>
            <p>
              No worries. Your slot has not been confirmed yet. You may go back
              and try again when ready.
            </p>

            <div className="thank-you-actions">
              <a className="btn btn-dark" href="/">
                Try Again
              </a>
              <a
                className="btn btn-outline"
                href="https://m.me/254698671071327"
                target="_blank"
                rel="noreferrer"
              >
                Message Us
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="site">
      <style>{css}</style>

      <header className="nav">
        <a className="brand" href="#top" aria-label="Abelle Studios home">
          <img
            src="/assets/logo-full-black.png"
            alt="Abelle Studios"
            className="brand-logo"
          />
        </a>

        <nav className="nav-links">
          <a href="#packages">Packages</a>
          <a href="#contact">Contact</a>
          <button className="nav-cta nav-cta-button" onClick={openBookingDrawer}>
            Book Now
          </button>
        </nav>
      </header>

      <section id="top" className="hero section-wrap">
        <div className="hero-copy">
          <p className="eyebrow">Photography & Videography</p>
          <h1>
            All Your Memories,
            <span>Create It Here.</span>
          </h1>
          <p className="lead">
            A simple, welcoming studio for portraits, families, barkada shoots,
            milestones, IDs, products, events, and creative ideas worth keeping.
          </p>
          <div className="hero-actions">
            <button className="btn btn-dark" onClick={openMessenger}>
              Message Us
            </button>
            <a className="btn btn-outline" href="#packages">
              View Packages
            </a>
          </div>
          <div className="hero-socials" aria-label="Abelle Studios social links">
            {socialLinks.map(({ name, href, icon }) => (
              <a
                key={name}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                aria-label={name}
              >
                <SocialIcon type={icon} />
              </a>
            ))}
          </div>
        </div>

        <div className="hero-visual" aria-label="Abelle Studios photo preview">
          <div className="photo-stack">
            <img
              className="photo-main"
              src="/assets/personal.jpg"
              alt="Personal portrait sample"
            />
            <img
              className="photo-small top"
              src="/assets/duo.jpg"
              alt="Duo portrait sample"
            />
            <img
              className="photo-small bottom"
              src="/assets/newborn.jpg"
              alt="Newborn portrait sample"
            />
          </div>
        </div>
      </section>

      <section className="studio-strip section-wrap">
        <div>
          <small>Location</small>
          <strong>RM 208, 2nd Floor, E.I. Building</strong>
        </div>
        <div>
          <small>Booking</small>
          <strong>Secure your slot online</strong>
        </div>
        <div>
          <small>Contact</small>
          <strong>{phoneNumber}</strong>
        </div>
      </section>

      <section className="section-wrap services-intro">
        <div className="section-heading">
          <p className="eyebrow">What We Offer</p>
          <h2>Studio services for everyday moments and special milestones.</h2>
        </div>
        <div className="service-list">
          {services.map((service) => (
            <span key={service}>{service}</span>
          ))}
        </div>
      </section>

      <section id="packages" className="section-wrap packages-section">
        <div className="section-heading narrow">
          <p className="eyebrow">Pricing</p>
          <h2>Studio Packages</h2>
          <p>
            Clear starting prices with guided posing, professional studio background,
            selected prints, and soft copies included depending on the package.
          </p>
        </div>

        <div className="package-grid">
          {packages.map((pkg) => (
            <article className={`package-card package-${pkg.id}`} key={pkg.id}>
              <figure className="package-media">
                <img src={pkg.image} alt={`${pkg.title} sample`} />
              </figure>
              <div className="package-content">
                <div className="package-topline">
                  <span>{pkg.id}</span>
                  <small>{pkg.tag}</small>
                </div>
                <h3>{pkg.title}</h3>
                <p className="package-desc">{pkg.desc}</p>
                <div className="package-divider" />
                <ul>
                  {pkg.inclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="package-footer">
                  <div>
                    <small>Starts at</small>
                    <strong>{pkg.price}</strong>
                  </div>
                </div>
                <button
                  className="btn btn-dark full"
                  onClick={() => choosePackageAndBook(pkg.id)}
                >
                  Book This Package
                </button>
              </div>
            </article>
          ))}

          <article className="custom-card">
            <div
              className="slideshow"
              aria-label="Abelle Studios sample photos slideshow"
            >
              {slideshowPhotos.map((photo, index) => (
                <img
                  key={photo.src}
                  src={photo.src}
                  alt="Abelle Studios sample work"
                  style={{
                    animationDelay: `${index * 3}s`,
                    objectPosition: photo.position,
                  }}
                />
              ))}
            </div>
            <div>
              <p className="eyebrow">And More</p>
              <h3>Something Else in Mind?</h3>
              <p>
                For maternity, newborn, graduation, engagement, pre-wedding, product,
                food, ID photos, or special events — send us a message and we’ll guide you.
              </p>
              <button className="btn btn-gold" onClick={openMessenger}>
                Ask Us Anything
              </button>
            </div>
          </article>
        </div>
      </section>


      <section className="section-wrap why-section">
        <div className="section-heading narrow">
          <p className="eyebrow">Our Promise</p>
          <h2>Why Choose Abelle Studios</h2>
        </div>
        <div className="why-grid">
          {whyUs.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      </section>

     <section id="contact" className="contact-section">
  <div className="section-wrap contact-layout">
    <div className="contact-main">
      <p className="eyebrow">Where to Find Us</p>
      <h2>Visit Abelle Studios</h2>
      <p>
  Drop by our studio for portraits, creative shoots, ID photos, and special
  milestones. Use the map to find us easily, or message us before visiting so
  we can prepare your slot.
</p>

      <div className="location-card">
        <small>Exact Location</small>
        <strong>Room 208, 2nd Floor, E.I. Building</strong>
        <span>Calle II de Febrero, Tradetown Funda-Dalipe, San Jose, Antique</span>
      </div>

      <div className="contact-icon-row" aria-label="Abelle Studios contact links">
        {socialLinks.map(({ name, href, icon }) => (
          <a
            key={name}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            aria-label={name}
            title={name}
          >
            <SocialIcon type={icon} size={19} />
          </a>
        ))}
      </div>

      <div className="contact-actions refined">
        <a
          className="btn btn-dark"
          href="https://maps.app.goo.gl/HW5aFdSiMmYcSvWx6"
          target="_blank"
          rel="noreferrer"
        >
          Open in Google Maps
        </a>
        <button className="btn btn-outline" onClick={openBookingDrawer}>
          Book a Session
        </button>
      </div>
    </div>

    <aside className="map-card">
      <div className="map-frame">
        <iframe
          title="Abelle Studios Location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3547.1548395351797!2d121.93561140000001!3d10.7549957!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33ae39c8d56e68d5%3A0x6ad2d0aa256d7e47!2sAbelle%20Studios!5e1!3m2!1sen!2sph!4v1781153469141!5m2!1sen!2sph"
          width="600"
          height="450"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="map-card-caption">
        <small>Abelle Studios</small>
        <span>San Jose, Antique</span>
      </div>
    </aside>
  </div>
</section>

      {isBookingOpen && (
        <div className="drawer-overlay" onClick={closeBookingDrawer}>
          <aside
            className="booking-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Book Your Shoot</p>
                <h2>Your booking is almost ready.</h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={closeBookingDrawer}
                aria-label="Close booking form"
              >
                ×
              </button>
            </div>

            <p className="drawer-intro">
              Choose your package, preferred date, and available time. Your
              selected slot will be secured once the required payment has been
              received.
            </p>

            <form className="drawer-form" onSubmit={submitBookingPreview}>
              <label>
                <span>Package</span>
                <select
                  name="packageId"
                  value={bookingForm.packageId}
                  onChange={updateBookingForm}
                  required
                >
                  {bookingPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.title} - {pkg.price}
                    </option>
                  ))}
                </select>
              </label>

              <div className="drawer-selected-package">
                <strong>{selectedBookingPackage.title}</strong>
                <p>{selectedBookingPackage.desc}</p>
                <span>{selectedBookingPackage.price}</span>
              </div>

              <div className="drawer-two-col">
                <label>
                  <span>Preferred date</span>
                  <input
                    type="date"
                    name="date"
                    value={bookingForm.date}
                    onChange={updateBookingForm}
                    required
                  />
                </label>

                <label>
                  <span>Selected time</span>
                  <input
                    type="text"
                    value={
                      bookingForm.time
                        ? bookingSlots.find((slot) => slot.value === bookingForm.time)
                            ?.label
                        : "Choose below"
                    }
                    readOnly
                  />
                </label>
              </div>

              {bookingForm.date && (
  <div className="drawer-slot-picker">
    <span>Available times</span>

    {isCheckingSlots ? (
      <p className="drawer-small-note">Checking available times...</p>
    ) : availableSlots.length > 0 ? (
      <div className="drawer-slot-grid">
        {availableSlots.map((slot) => (
          <button
            type="button"
            key={slot.value}
            className={
              bookingForm.time === slot.value
                ? "drawer-slot active"
                : "drawer-slot"
            }
            onClick={() =>
              setBookingForm((current) => ({
                ...current,
                time: slot.value,
              }))
            }
          >
            {slot.label}
          </button>
        ))}
      </div>
    ) : (
      <p className="drawer-small-note">
        Sorry, all slots are booked for this date. Please choose another date.
      </p>
    )}
  </div>
)}

              <label>
                <span>Full name</span>
                <input
                  type="text"
                  name="name"
                  value={bookingForm.name}
                  onChange={updateBookingForm}
                  required
                />
              </label>

              <div className="drawer-two-col">
                <label>
                  <span>Mobile number</span>
                  <input
                    type="tel"
                    name="phone"
                    value={bookingForm.phone}
                    onChange={updateBookingForm}
                    required
                  />
                </label>

                <label>
                  <span>Email address</span>
                  <input
                    type="email"
                    name="email"
                    value={bookingForm.email}
                    onChange={updateBookingForm}
                    required
                  />
                </label>
              </div>

              <label>
                <span>Notes / theme / special request</span>
                <textarea
                  name="notes"
                  value={bookingForm.notes}
                  onChange={updateBookingForm}
                  placeholder="Tell us about your shoot idea, number of people, or preferred setup."
                />
              </label>

              <div className="drawer-field">
  <span className="drawer-field-title">Choose your payment option</span>

  <div className="payment-options">
    <label
      className={
        paymentOption === "full_online"
          ? "payment-option-card active"
          : "payment-option-card"
      }
    >
      <input
        type="radio"
        name="paymentOption"
        value="full_online"
        checked={paymentOption === "full_online"}
        onChange={(event) => setPaymentOption(event.target.value)}
      />
      <span>
        <strong>Pay in full online</strong>
        <small>
          Pay the full package amount through PayMongo. Online processing fees
          are added at checkout. Your booking is automatically confirmed once
          payment is completed.
        </small>
      </span>
    </label>

    <label
      className={
        paymentOption === "dp_gcash_balance_instudio"
          ? "payment-option-card active"
          : "payment-option-card"
      }
    >
      <input
        type="radio"
        name="paymentOption"
        value="dp_gcash_balance_instudio"
        checked={paymentOption === "dp_gcash_balance_instudio"}
        onChange={(event) => setPaymentOption(event.target.value)}
      />
      <span>
        <strong>50% down payment via GCash</strong>
        <small>
          Receive our GCash details by email. Please send your proof of payment
          to Messenger so we can manually confirm your booking. The remaining
          balance is payable in-studio.
        </small>
      </span>
    </label>
  </div>
</div>

              <div className="drawer-payment-preview">
  <div>
    <span>Package price</span>
    <strong>₱{selectedPackagePrice.toLocaleString()}</strong>
  </div>

  <div>
    <span>Payment method</span>
    <strong>
      {paymentOption === "full_online"
        ? "PayMongo full online payment"
        : "GCash down payment"}
    </strong>
  </div>

  <div className="drawer-payment-total">
    <span>
      {paymentOption === "full_online"
        ? "Full payment now"
        : "Down payment now"}
    </span>
    <strong>₱{paymentSummary.amountDueToday.toLocaleString()}</strong>
  </div>

  <div>
    <span>Remaining balance</span>
    <strong>₱{paymentSummary.remainingBalance.toLocaleString()}</strong>
  </div>
</div>

             <button className="btn btn-dark full" disabled={!bookingForm.time}>
  {paymentOption === "full_online"
    ? "Continue to PayMongo Checkout"
    : "Submit Booking Request"}
</button>

              <p className="drawer-small-note">
  {paymentOption === "full_online"
    ? "You will be redirected to our secure PayMongo checkout page. Online processing fees are added at checkout."
    : "We’ll email the GCash payment details after receiving your request. Please send proof of payment through Messenger so we can manually confirm your booking."}
</p>
            </form>
          </aside>
        </div>
      )}

      <footer className="footer">
        <p>© 2026 Abelle Studios. All rights reserved.</p>
      </footer>
    </main>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500;600&display=swap');

:root {
  --bg: #f4f2ef;
  --paper: #ffffff;
  --soft: #eeeae4;
  --cream: #f8f5ef;
  --ink: #111111;
  --muted: #6f6a63;
  --faint: rgba(17,17,17,.08);
  --gold: #c9a96e;
  --gold-dark: #aa8751;
  --dark: #111111;
  --shadow: 0 22px 60px rgba(0,0,0,.08);
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: 'Jost', Arial, sans-serif; }
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; }

.site { min-height: 100vh; overflow-x: hidden; background: linear-gradient(180deg, #f4f2ef 0%, #eee9e2 100%); }
.section-wrap { width: min(1100px, calc(100% - 48px)); margin: 0 auto; }

.nav {
  width: min(1100px, calc(100% - 48px));
  margin: 0 auto;
  padding: 15px 0;
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: blur(14px);
  background: rgba(244,242,239,.88);
  border-bottom: 1px solid var(--faint);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.brand { display: flex; align-items: center; gap: 12px; min-width: 0; }

.brand-logo {
  width: clamp(170px, 24vw, 320px);
  height: auto;
  max-height: 64px;
  object-fit: contain;
  display: block;
  opacity: 1;
  filter: none;
}

.brand-text { display: none; }
.brand-main { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 27px; line-height: .95; font-weight: 500; letter-spacing: -.03em; }
.brand-sub { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .16em; }

.nav-links { display: flex; align-items: center; gap: 22px; color: var(--muted); font-size: 14px; }
.nav-links a:hover { color: var(--ink); }

.nav-cta {
  background: var(--dark);
  color: var(--bg) !important;
  padding: 10px 18px;
  border-radius: 999px;
}

.nav-cta-button {
  border: 0;
  font-family: 'Jost', Arial, sans-serif;
  cursor: pointer;
}

.eyebrow {
  margin: 0 0 14px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .36em;
}

h1, h2, h3 {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-weight: 300;
  margin: 0;
  letter-spacing: -.025em;
  color: var(--ink);
}

h1 { font-size: clamp(56px, 8.5vw, 108px); line-height: .94; max-width: 760px; }
h1 span { display: block; color: var(--gold); font-style: italic; }
h2 { font-size: clamp(38px, 5vw, 64px); line-height: 1; }
h3 { font-size: clamp(30px, 3.5vw, 44px); line-height: 1.05; }
p { color: var(--muted); line-height: 1.75; }
.lead { font-size: 16px; max-width: 520px; margin: 22px 0 0; }

.btn {
  border: 1px solid var(--ink);
  background: transparent;
  min-height: 46px;
  padding: 0 24px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: .15em;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  transition: .2s ease;
}

.btn:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.12); }
.btn-dark { background: var(--dark); color: var(--bg); }
.btn-outline { background: transparent; color: var(--ink); }
.btn-gold { background: var(--gold); border-color: var(--gold); color: var(--ink); }
.btn-gold:hover { background: var(--gold-dark); border-color: var(--gold-dark); color: var(--paper); }
.full { width: 100%; }

.hero {
  padding: 72px 0 60px;
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: 64px;
  align-items: center;
}

.hero-actions { margin-top: 32px; display: flex; gap: 12px; flex-wrap: wrap; }
.hero-socials { display: flex; gap: 10px; margin-top: 22px; }

.hero-socials a,
.footer-socials a {
  width: 38px;
  height: 38px;
  border: 1px solid var(--faint);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  background: rgba(255,255,255,.35);
  transition: .2s ease;
}

.hero-socials a:hover,
.footer-socials a:hover {
  transform: translateY(-2px);
  background: var(--paper);
  color: var(--gold-dark);
}

.hero-visual { position: relative; min-height: 620px; }
.photo-stack { position: relative; height: 620px; }

.photo-stack img {
  position: absolute;
  object-fit: cover;
  display: block;
  box-shadow: var(--shadow);
  background: var(--soft);
}

.photo-main { width: 62%; height: 88%; right: 0; top: 0; object-position: center 30%; }
.photo-small.top { width: 42%; aspect-ratio: 3 / 4; height: auto; left: 0; top: 34px; object-position: center 16%; }
.photo-small.bottom { width: 46%; aspect-ratio: 4 / 3; height: auto; left: 10%; bottom: 0; object-position: center; }

.studio-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--faint);
  border-bottom: 1px solid var(--faint);
}

.studio-strip div { padding: 24px; border-right: 1px solid var(--faint); }
.studio-strip div:last-child { border-right: 0; }

.studio-strip small,
.contact-info small {
  display: block;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: .18em;
  font-size: 10px;
  margin-bottom: 5px;
}

.studio-strip strong {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 20px;
  font-weight: 400;
}

.services-intro,
.packages-section,
.why-section {
  padding: 58px 0;
}

.section-heading {
  max-width: 900px;
  margin: 0 auto 36px;
  text-align: center;
}

.section-heading.narrow {
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.section-heading p {
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.section-heading .eyebrow {
  text-align: center;
}

.services-intro .section-heading {
  max-width: 980px;
}

.service-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px 28px;
}

.service-list span {
  color: #444;
  font-size: 14px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.service-list span::before {
  content: '';
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--gold);
  flex: 0 0 auto;
}

.package-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }

.package-card {
  background: var(--paper);
  border: 1px solid var(--faint);
  box-shadow: 0 12px 34px rgba(0,0,0,.045);
  display: grid;
  grid-template-rows: auto auto;
  overflow: hidden;
}

.package-media { margin: 0; background: var(--soft); overflow: hidden; }

.package-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .35s ease;
}

.package-card:hover .package-media img { transform: scale(1.018); }

.package-01 .package-media,
.package-02 .package-media {
  aspect-ratio: 3 / 4;
}

.package-03 .package-media,
.package-04 .package-media {
  aspect-ratio: 4 / 3;
}

.package-01 .package-media img { object-position: center 28%; }
.package-02 .package-media img { object-position: center 18%; }
.package-03 .package-media img { object-position: center 45%; }
.package-04 .package-media img { object-position: center 42%; }

.package-content {
  padding: 34px;
  display: flex;
  flex-direction: column;
  min-height: 580px;
}

.package-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.package-topline span {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 56px;
  line-height: .8;
  color: rgba(0,0,0,.07);
}

.package-topline small {
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: .22em;
  font-size: 10px;
  text-align: right;
}

.package-desc { font-size: 13px; margin: 10px 0 0; color: #777; }
.package-divider { height: 1px; background: var(--faint); margin: 18px 0; }

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

li {
  color: #444;
  font-size: 13px;
  line-height: 1.5;
  padding-left: 16px;
  position: relative;
}

li::before {
  content: '—';
  color: var(--gold);
  position: absolute;
  left: 0;
}

.package-footer { margin-top: auto; padding-top: 24px; }

.package-footer small {
  color: #999;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: 10px;
  display: block;
}

.package-footer strong {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 46px;
  line-height: 1;
}

.package-content .btn { margin-top: 22px; }

.custom-card {
  grid-column: 1 / -1;
  background: var(--dark);
  color: var(--bg);
  min-height: 390px;
  display: grid;
  grid-template-columns: 42% 1fr;
  overflow: hidden;
}

.slideshow {
  position: relative;
  min-height: 390px;
  overflow: hidden;
  background: #222;
}

.slideshow img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  animation: fadeSlide 15s infinite;
  filter: saturate(.92);
}

.custom-card > div:not(.slideshow) {
  padding: 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.custom-card h3 { color: var(--bg); }
.custom-card p { color: rgba(244,242,239,.6); max-width: 560px; }
.custom-card .btn { align-self: center; margin-top: 18px; }

@keyframes fadeSlide {
  0% { opacity: 0; transform: scale(1.04); }
  5% { opacity: 1; }
  25% { opacity: 1; }
  33% { opacity: 0; transform: scale(1); }
  100% { opacity: 0; }
}

.promo-section { background: var(--dark); padding: 58px 0; }
.promo-inner { color: var(--bg); }
.dark-heading h2 { color: var(--bg); }
.dark-heading p { color: rgba(244,242,239,.62); }

.promo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.promo-card {
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(201,169,110,.26);
  padding: 34px;
}

.promo-card p {
  margin: 0 0 8px;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: .22em;
  font-size: 10px;
}

.promo-card h3 { color: var(--bg); }

.promo-card strong {
  display: block;
  font-family: 'Cormorant Garamond', Georgia, serif;
  color: var(--gold);
  font-size: 56px;
  line-height: 1;
  margin: 10px 0 18px;
}

.promo-card li { color: rgba(244,242,239,.7); }
.promo-card .btn { margin-top: 24px; }

.why-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.why-grid div {
  background: var(--paper);
  border: 1px solid var(--faint);
  padding: 26px;
  text-align: center;
  color: #444;
  min-height: 100px;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  will-change: transform;
}

.why-grid div::after {
  content: "";
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 0;
  height: 2px;
  background: var(--gold);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform .25s ease;
}

.why-grid div:hover {
  transform: translateY(-6px);
  box-shadow: 0 18px 38px rgba(0,0,0,.08);
  border-color: rgba(201,169,110,.36);
}

.why-grid div:hover::after {
  transform: scaleX(1);
}

.contact-section {
  background: #f0ede8;
  padding: 72px 0;
}

.contact-layout {
  display: grid;
  grid-template-columns: .9fr 1.1fr;
  gap: 48px;
  align-items: center;
}

.contact-main {
  text-align: left;
}

.contact-main h2 {
  max-width: 560px;
}

.contact-main p {
  max-width: 560px;
  font-size: 15px;
}

.location-card {
  margin: 28px 0 22px;
  padding: 22px;
  background: rgba(255,255,255,.58);
  border: 1px solid var(--faint);
}

.location-card small {
  display: block;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: .18em;
  font-size: 10px;
  margin-bottom: 8px;
}

.location-card strong {
  display: block;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 28px;
  font-weight: 400;
  line-height: 1.1;
  margin-bottom: 6px;
}

.location-card span {
  display: block;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.contact-icon-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 24px;
}

.contact-icon-row a {
  width: 44px;
  height: 44px;
  border: 1px solid var(--faint);
  background: var(--paper);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  transition: .2s ease;
}

.contact-icon-row a:hover {
  transform: translateY(-2px);
  color: var(--gold-dark);
  box-shadow: 0 12px 28px rgba(0,0,0,.08);
}

.contact-actions.refined {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.map-card {
  background: var(--paper);
  border: 1px solid var(--faint);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.map-frame {
  width: 100%;
  height: 420px;
  background: var(--soft);
}

.map-frame iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.map-card-caption {
  padding: 18px 22px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  border-top: 1px solid var(--faint);
}

.map-card-caption small {
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: .18em;
  font-size: 10px;
}

.map-card-caption span {
  color: var(--muted);
  font-size: 13px;
}

.footer {
  background: var(--dark);
  color: rgba(244,242,239,.72);
  padding: 30px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.footer p {
  margin: 0;
  color: rgba(244,242,239,.72);
  font-size: 13px;
  letter-spacing: .06em;
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(17, 17, 17, .45);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: flex-end;
}

.booking-drawer {
  width: min(560px, 100%);
  height: 100vh;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(201,169,110,.18), transparent 34%),
    #f8f5ef;
  box-shadow: -24px 0 70px rgba(0,0,0,.24);
  padding: 34px;
  animation: drawerIn .28s ease both;
}

@keyframes drawerIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.drawer-header h2 {
  font-size: clamp(34px, 5vw, 52px);
}

.drawer-close {
  width: 42px;
  height: 42px;
  border: 1px solid var(--faint);
  background: var(--paper);
  color: var(--ink);
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

.drawer-intro {
  margin: 0 0 24px;
  font-size: 14px;
}

.drawer-form {
  background: var(--paper);
  border: 1px solid var(--faint);
  box-shadow: var(--shadow);
  padding: 24px;
  display: grid;
  gap: 16px;
}

.drawer-form label {
  display: grid;
  gap: 7px;
}

.drawer-form label span,
.drawer-slot-picker > span {
  color: var(--gold-dark);
  text-transform: uppercase;
  letter-spacing: .16em;
  font-size: 10px;
  font-weight: 500;
}

.drawer-form input,
.drawer-form select,
.drawer-form textarea {
  width: 100%;
  border: 1px solid rgba(17,17,17,.14);
  background: #fff;
  color: var(--ink);
  min-height: 48px;
  padding: 12px 14px;
  font-family: 'Jost', Arial, sans-serif;
  font-size: 14px;
  outline: none;
  color-scheme: light;
  caret-color: var(--ink);
}

.drawer-form input::placeholder,
.drawer-form textarea::placeholder {
  color: rgba(17,17,17,.45);
}

.drawer-form input[type="date"] {
  color: var(--ink);
  appearance: auto;
  -webkit-appearance: auto;
}

.drawer-form input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 1;
  cursor: pointer;
  filter: invert(0);
}

.drawer-form input[type="date"]::-webkit-datetime-edit,
.drawer-form input[type="date"]::-webkit-datetime-edit-fields-wrapper,
.drawer-form input[type="date"]::-webkit-datetime-edit-text,
.drawer-form input[type="date"]::-webkit-datetime-edit-month-field,
.drawer-form input[type="date"]::-webkit-datetime-edit-day-field,
.drawer-form input[type="date"]::-webkit-datetime-edit-year-field {
  color: var(--ink);
}

.drawer-form textarea {
  min-height: 96px;
  resize: vertical;
}

.drawer-form input:focus,
.drawer-form select:focus,
.drawer-form textarea:focus {
  border-color: var(--gold);
  color: var(--ink);
  background: #fff;
}

.drawer-selected-package {
  background: var(--cream);
  border: 1px solid var(--faint);
  padding: 16px;
}

.drawer-selected-package strong {
  display: block;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 27px;
  font-weight: 400;
}

.drawer-selected-package p {
  margin: 6px 0;
  font-size: 13px;
}

.drawer-selected-package span {
  display: block;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 32px;
  color: var(--gold-dark);
}

.drawer-two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.drawer-slot-picker {
  display: grid;
  gap: 10px;
}

.drawer-slot-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.drawer-slot {
  border: 1px solid rgba(17,17,17,.14);
  background: #fff;
  min-height: 44px;
  cursor: pointer;
  font-family: 'Jost', Arial, sans-serif;
  transition: .2s ease;
}

.drawer-slot:hover {
  border-color: var(--gold);
  transform: translateY(-1px);
}

.drawer-slot.active {
  background: var(--dark);
  color: var(--bg);
  border-color: var(--dark);
}

.drawer-field {
  display: grid;
  gap: 8px;
}

.drawer-field-title {
  color: var(--gold-dark);
  text-transform: uppercase;
  letter-spacing: .16em;
  font-size: 10px;
  font-weight: 500;
}

.payment-options {
  display: grid;
  gap: 10px;
}

.payment-option-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 15px;
  border: 1px solid rgba(17,17,17,.12);
  background: #fff;
  cursor: pointer;
  transition: .2s ease;
}

.payment-option-card:hover {
  border-color: rgba(201,169,110,.72);
  transform: translateY(-1px);
}

.payment-option-card.active {
  border-color: var(--gold);
  background: #fcf8f1;
  box-shadow: 0 10px 24px rgba(0,0,0,.05);
}

.payment-option-card input {
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  margin-top: 3px;
  accent-color: var(--gold-dark);
}

.payment-option-card strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.35;
}

.payment-option-card small {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
  text-transform: none;
  letter-spacing: normal;
}

.drawer-payment-preview {
  background: #f8f5ef;
  border: 1px solid var(--faint);
  padding: 18px;
  display: grid;
  gap: 11px;
}

.drawer-payment-preview div {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  color: var(--muted);
  font-size: 14px;
}

.drawer-payment-preview strong {
  color: var(--ink);
}

.drawer-payment-preview .drawer-payment-total {
  border-top: 1px solid var(--faint);
  padding-top: 13px;
  margin-top: 4px;
  color: var(--ink);
}

.drawer-payment-preview .drawer-payment-total strong {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 32px;
  color: var(--gold-dark);
  line-height: 1;
}

.drawer-small-note {
  text-align: center;
  font-size: 12px;
  margin: -3px 0 0;
}
.thank-you-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px 24px;
  background:
    radial-gradient(circle at top left, rgba(201,169,110,.18), transparent 32%),
    linear-gradient(180deg, #f4f2ef 0%, #eee9e2 100%);
}

.thank-you-card {
  width: min(760px, 100%);
  background: var(--paper);
  border: 1px solid var(--faint);
  box-shadow: var(--shadow);
  padding: clamp(34px, 6vw, 72px);
  text-align: center;
}

.thank-you-card h1 {
  font-size: clamp(44px, 7vw, 82px);
  line-height: .95;
  max-width: none;
}

.thank-you-card p {
  max-width: 560px;
  margin: 24px auto 0;
}

.thank-you-actions {
  margin-top: 32px;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
@media (max-width: 980px) {
  .hero,
.contact-layout {
  grid-template-columns: 1fr;
}

  .hero-visual {
    max-width: 520px;
  }

  .package-grid {
    grid-template-columns: 1fr;
  }

  .studio-strip {
    grid-template-columns: 1fr;
  }

  .studio-strip div {
    border-right: 0;
    border-bottom: 1px solid var(--faint);
  }

  .studio-strip div:last-child {
    border-bottom: 0;
  }
}

@media (max-width: 720px) {
  .section-wrap,
  .nav {
    width: min(100% - 32px, 1100px);
  }

  .nav-links a:not(.nav-cta) {
    display: none;
  }

  .brand-logo {
    width: clamp(130px, 44vw, 190px);
    max-height: 48px;
  }

  .hero {
    padding: 46px 0;
    gap: 34px;
  }

  h1 {
    font-size: clamp(48px, 15vw, 74px);
  }

  .hero-actions,
.contact-actions.refined {
  flex-direction: column;
}

  .btn {
  width: 100%;
}

.contact-section {
  padding: 52px 0;
}

.contact-main {
  text-align: center;
}

.contact-main h2,
.contact-main p {
  margin-left: auto;
  margin-right: auto;
}

.contact-icon-row {
  justify-content: center;
}

.map-frame {
  height: 320px;
}

.map-card-caption {
  flex-direction: column;
  text-align: center;
  gap: 6px;
}
  .hero-visual {
    min-height: auto;
  }

  .photo-stack {
    height: auto;
    display: grid;
    gap: 12px;
  }

  .photo-stack img {
    position: static;
    width: 100% !important;
    height: auto !important;
  }

  .photo-main,
  .photo-small.top,
  .photo-small.bottom {
    aspect-ratio: 3 / 4;
  }

  .services-intro,
  .packages-section,
  .why-section,
  .promo-section,
  .contact-section {
    padding: 46px 0;
  }

  .package-01 .package-media,
  .package-02 .package-media {
    aspect-ratio: 3 / 4;
  }

  .package-03 .package-media,
  .package-04 .package-media {
    aspect-ratio: 4 / 3;
  }

  .package-media img {
    height: 100%;
    object-fit: cover;
  }

  .package-content,
  .custom-card > div:not(.slideshow) {
    padding: 26px 22px;
    min-height: auto;
  }

  .package-footer {
    display: block;
  }

  .custom-card {
    grid-template-columns: 1fr;
  }

  .slideshow {
    min-height: 310px;
  }

  .promo-grid,
  .why-grid {
    grid-template-columns: 1fr;
  }

  .footer {
    flex-direction: column;
    text-align: center;
  }

  .booking-drawer {
    width: 100%;
    padding: 22px 16px;
  }

  .drawer-form {
    padding: 20px 16px;
  }

  .drawer-two-col {
    grid-template-columns: 1fr;
  }

  .drawer-slot-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;

export default App;