const messengerLink = "https://m.me/254698671071327";
const phoneNumber = "+63 993 009 4179";
const phoneLink = "tel:+639930094179";
const mapLink = "https://maps.google.com/?q=RM+208+2nd+Floor+E.I.+Building+Calle+II+de+Febrero+Tradetown+Funda-Dalipe+San+Jose+Antique";

const socialLinks = [
  { name: "Phone", label: phoneNumber, href: phoneLink, icon: "phone" },
  { name: "Facebook", label: "Facebook", href: "https://www.facebook.com/profile.php?id=254698671071327", icon: "facebook" },
  { name: "Messenger", label: "Messenger", href: messengerLink, icon: "messenger" },
  { name: "Instagram", label: "@abellestudios_antq", href: "https://www.instagram.com/abellestudios_antq", icon: "instagram" },
  { name: "TikTok", label: "@abellestudios_antq", href: "https://www.tiktok.com/@abellestudios_antq", icon: "tiktok" },
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
      "1 chosen portrait in A4 print with basic frame",
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
      "1 chosen portrait in A4 print with basic frame",
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
      "1 chosen shot in A4 print with basic frame",
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
      "2 chosen portraits in A4 print with basic frame",
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

const studentPromos = [
  {
    name: "Student Package",
    price: "₱249",
    for: "1 person",
    items: ["20 shots", "15 soft copies", "1 4R print", "2 wallet-size prints"],
  },
  {
    name: "Tropa Pics",
    price: "₱498",
    for: "2–5 people",
    items: ["20 shots", "15 soft copies", "Group studio shoot", "Perfect for friends & classmates"],
  },
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
          <path d="M6.6 10.8c1.8 3.5 3.1 4.8 6.6 6.6l2.1-2.1c.4-.4.9-.5 1.4-.3 1 .3 2 .5 3.1.5.7 0 1.2.5 1.2 1.2v3.1c0 .7-.5 1.2-1.2 1.2C10.4 21 3 13.6 3 4.2 3 3.5 3.5 3 4.2 3h3.1c.7 0 1.2.5 1.2 1.2 0 1.1.2 2.1.5 3.1.1.5 0 1-.3 1.4l-2.1 2.1z" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14 8h2V5h-2c-2.8 0-4.5 1.7-4.5 4.5V12H7v3h2.5v6h3.2v-6h2.6l.5-3h-3.1V9.7c0-1.1.4-1.7 1.3-1.7z" fill="currentColor" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3zm0 2A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19h9a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 16.5 5h-9z" fill="currentColor" />
          <path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm4.9-2.7a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0z" fill="currentColor" />
        </svg>
      );
    case "messenger":
      return (
        <svg {...common}>
          <path d="M12 3C6.9 3 3 6.7 3 11.5c0 2.7 1.3 5.1 3.4 6.7V21l3.1-1.7c.8.2 1.6.3 2.5.3 5.1 0 9-3.7 9-8.5S17.1 3 12 3zm1 11.4-2.3-2.5-4.5 2.5 5-5.3 2.3 2.5 4.4-2.5-4.9 5.3z" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M15.2 3c.3 2.2 1.5 3.8 3.8 4.1v3c-1.4 0-2.7-.4-3.8-1.1v5.9c0 3.1-2.5 5.5-5.5 5.5s-5.4-2.4-5.4-5.4S6.7 9.6 9.7 9.6c.4 0 .7 0 1 .1V13c-.3-.2-.6-.2-1-.2-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-.9 2.2-2.2V3h3.3z" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

function App() {
  const openMessenger = () => window.open(messengerLink, "_blank");
  const openCall = () => window.open(phoneLink);
  const openMaps = () => window.open(mapLink, "_blank");

  return (
    <main className="site">
      <style>{css}</style>

      <header className="nav">
        <a className="brand" href="#top" aria-label="Abelle Studios home">
          <img src="/assets/logo-full-black.png" alt="Abelle Studios" className="brand-logo" />
        </a>

        <nav className="nav-links">
          <a href="#packages">Packages</a>
          <a href="#promos">Promos</a>
          <a href="#contact">Contact</a>
          <a href="#contact" className="nav-cta">Book Now</a>
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
            <button className="btn btn-dark" onClick={openMessenger}>Message Us</button>
            <a className="btn btn-outline" href="#packages">View Packages</a>
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
            <img className="photo-main" src="/assets/personal.jpg" alt="Personal portrait sample" />
            <img className="photo-small top" src="/assets/duo.jpg" alt="Duo portrait sample" />
            <img className="photo-small bottom" src="/assets/newborn.jpg" alt="Newborn portrait sample" />
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
          <strong>Message first to confirm availability</strong>
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
          {services.map((service) => <span key={service}>{service}</span>)}
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
                  {pkg.inclusions.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <div className="package-footer">
                  <div>
                    <small>Starts at</small>
                    <strong>{pkg.price}</strong>
                  </div>
                </div>
                <button className="btn btn-dark full" onClick={openMessenger}>Inquire Now</button>
              </div>
            </article>
          ))}

          <article className="custom-card">
            <div className="slideshow" aria-label="Abelle Studios sample photos slideshow">
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
              <button className="btn btn-gold" onClick={openMessenger}>Ask Us Anything</button>
            </div>
          </article>
        </div>
      </section>

      <section id="promos" className="promo-section">
        <div className="section-wrap promo-inner">
          <div className="section-heading dark-heading">
            <p className="eyebrow">Special Offer</p>
            <h2>Student Promos</h2>
            <p>Simple, budget-friendly studio options for students, friends, and classmates.</p>
          </div>
          <div className="promo-grid">
            {studentPromos.map((promo) => (
              <article className="promo-card" key={promo.name}>
                <p>Good for {promo.for}</p>
                <h3>{promo.name}</h3>
                <strong>{promo.price}</strong>
                <ul>
                  {promo.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <button className="btn btn-gold full" onClick={openMessenger}>Avail This Promo</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-wrap why-section">
        <div className="section-heading narrow">
          <p className="eyebrow">Our Promise</p>
          <h2>Why Choose Abelle Studios</h2>
        </div>
        <div className="why-grid">
          {whyUs.map((item) => <div key={item}>{item}</div>)}
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="section-wrap contact-grid">
          <div>
            <p className="eyebrow">Get in Touch</p>
            <h2>Ready to create your shoot?</h2>
            <p>
              Message us to check availability, ask about packages, or plan your concept
              with Abelle Studios.
            </p>
            <div className="contact-info">
              <div><small>Address</small><span>RM 208, 2nd Floor, E.I. Building, Calle II de Febrero, Tradetown Funda-Dalipe, San Jose, Antique</span></div>
              <div><small>Phone</small><span>{phoneNumber}</span></div>
              <div><small>Social</small><span>@abellestudios_antq</span></div>
            </div>
            <div className="contact-actions">
              <button className="btn btn-dark" onClick={openMessenger}>Message on Messenger</button>
              <button className="btn btn-outline" onClick={openCall}>Call / Text Us</button>
              <button className="btn btn-outline" onClick={openMaps}>Get Directions</button>
            </div>
            <div className="social-row">
              {socialLinks.map(({ name, label, href, icon }) => (
                <a
                  key={name}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noreferrer" : undefined}
                  className="social-link"
                >
                  <SocialIcon type={icon} />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
          <aside className="quote-card">
            <small>our promise</small>
            <blockquote>“All your memories, create it here.”</blockquote>
            <span>Abelle Studios · San Jose, Antique</span>
          </aside>
        </div>
      </section>

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
  width: min(1100px, calc(100% - 48px)); margin: 0 auto; padding: 15px 0;
  position: sticky; top: 0; z-index: 40; backdrop-filter: blur(14px);
  background: rgba(244,242,239,.88); border-bottom: 1px solid var(--faint);
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
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
.nav-cta { background: var(--dark); color: var(--bg) !important; padding: 10px 18px; border-radius: 999px; }

.eyebrow { margin: 0 0 14px; color: var(--gold); font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .36em; }
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

.btn { border: 1px solid var(--ink); background: transparent; min-height: 46px; padding: 0 24px; cursor: pointer; text-transform: uppercase; letter-spacing: .15em; font-size: 12px; font-weight: 500; display: inline-flex; justify-content: center; align-items: center; transition: .2s ease; }
.btn:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.12); }
.btn-dark { background: var(--dark); color: var(--bg); }
.btn-outline { background: transparent; color: var(--ink); }
.btn-gold { background: var(--gold); border-color: var(--gold); color: var(--ink); }
.btn-gold:hover { background: var(--gold-dark); border-color: var(--gold-dark); color: var(--paper); }
.full { width: 100%; }

.hero { padding: 72px 0 60px; display: grid; grid-template-columns: 1fr 440px; gap: 64px; align-items: center; }
.hero-actions { margin-top: 32px; display: flex; gap: 12px; flex-wrap: wrap; }
.hero-socials { display: flex; gap: 10px; margin-top: 22px; }
.hero-socials a, .footer-socials a { width: 38px; height: 38px; border: 1px solid var(--faint); display: inline-flex; align-items: center; justify-content: center; color: var(--ink); background: rgba(255,255,255,.35); transition: .2s ease; }
.hero-socials a:hover, .footer-socials a:hover { transform: translateY(-2px); background: var(--paper); color: var(--gold-dark); }
.hero-visual { position: relative; min-height: 620px; }
.photo-stack { position: relative; height: 620px; }
.photo-stack img { position: absolute; object-fit: cover; display: block; box-shadow: var(--shadow); background: var(--soft); }
.photo-main { width: 62%; height: 88%; right: 0; top: 0; object-position: center 30%; }
.photo-small.top { width: 42%; aspect-ratio: 3 / 4; height: auto; left: 0; top: 34px; object-position: center 16%; }
.photo-small.bottom { width: 46%; aspect-ratio: 4 / 3; height: auto; left: 10%; bottom: 0; object-position: center; }

.studio-strip { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--faint); border-bottom: 1px solid var(--faint); }
.studio-strip div { padding: 24px; border-right: 1px solid var(--faint); }
.studio-strip div:last-child { border-right: 0; }
.studio-strip small, .contact-info small { display: block; color: var(--gold); text-transform: uppercase; letter-spacing: .18em; font-size: 10px; margin-bottom: 5px; }
.studio-strip strong { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 400; }

.services-intro, .packages-section, .why-section { padding: 58px 0; }
.section-heading { max-width: 760px; margin-bottom: 36px; }
.section-heading.narrow { max-width: 680px; }
.section-heading p { max-width: 640px; }
.service-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px 28px; }
.service-list span { color: #444; font-size: 14px; display: flex; gap: 10px; align-items: center; }
.service-list span::before { content: ''; width: 15px; height: 15px; border-radius: 50%; background: var(--gold); flex: 0 0 auto; }

.package-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.package-card { background: var(--paper); border: 1px solid var(--faint); box-shadow: 0 12px 34px rgba(0,0,0,.045); display: grid; grid-template-rows: auto auto; overflow: hidden; }
.package-media { margin: 0; background: var(--soft); overflow: hidden; }
.package-media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .35s ease; }
.package-card:hover .package-media img { transform: scale(1.018); }
.package-01 .package-media, .package-02 .package-media { aspect-ratio: 3 / 4; }
.package-03 .package-media, .package-04 .package-media { aspect-ratio: 4 / 3; }
.package-01 .package-media img { object-position: center 28%; }
.package-02 .package-media img { object-position: center 18%; }
.package-03 .package-media img { object-position: center 45%; }
.package-04 .package-media img { object-position: center 42%; }
.package-content { padding: 34px; display: flex; flex-direction: column; min-height: 580px; }
.package-topline { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 12px; }
.package-topline span { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 56px; line-height: .8; color: rgba(0,0,0,.07); }
.package-topline small { color: var(--gold); text-transform: uppercase; letter-spacing: .22em; font-size: 10px; text-align: right; }
.package-desc { font-size: 13px; margin: 10px 0 0; color: #777; }
.package-divider { height: 1px; background: var(--faint); margin: 18px 0; }
ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
li { color: #444; font-size: 13px; line-height: 1.5; padding-left: 16px; position: relative; }
li::before { content: '—'; color: var(--gold); position: absolute; left: 0; }
.package-footer { margin-top: auto; padding-top: 24px; }
.package-footer small { color: #999; text-transform: uppercase; letter-spacing: .12em; font-size: 10px; display: block; }
.package-footer strong { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 46px; line-height: 1; }
.package-content .btn { margin-top: 22px; }

.custom-card { grid-column: 1 / -1; background: var(--dark); color: var(--bg); min-height: 390px; display: grid; grid-template-columns: 42% 1fr; overflow: hidden; }
.slideshow { position: relative; min-height: 390px; overflow: hidden; background: #222; }
.slideshow img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; animation: fadeSlide 15s infinite; filter: saturate(.92); }
.custom-card > div:not(.slideshow) { padding: 42px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
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
.promo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.promo-card { background: rgba(255,255,255,.055); border: 1px solid rgba(201,169,110,.26); padding: 34px; }
.promo-card p { margin: 0 0 8px; color: var(--gold); text-transform: uppercase; letter-spacing: .22em; font-size: 10px; }
.promo-card h3 { color: var(--bg); }
.promo-card strong { display: block; font-family: 'Cormorant Garamond', Georgia, serif; color: var(--gold); font-size: 56px; line-height: 1; margin: 10px 0 18px; }
.promo-card li { color: rgba(244,242,239,.7); }
.promo-card .btn { margin-top: 24px; }

.why-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.why-grid div { background: var(--paper); border: 1px solid var(--faint); padding: 26px; text-align: center; color: #444; min-height: 100px; display: grid; place-items: center; }

.contact-section { background: #f0ede8; padding: 58px 0; }
.contact-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center; }
.contact-grid h2 { max-width: 620px; }
.contact-grid p { max-width: 560px; }
.contact-info { display: grid; gap: 16px; margin: 28px 0; }
.contact-info span { color: #333; font-size: 14px; }
.contact-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.social-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.social-link { display: inline-flex; align-items: center; gap: 9px; padding: 10px 13px; background: var(--paper); border: 1px solid var(--faint); color: #444; font-size: 13px; transition: .2s ease; }
.social-link:hover { transform: translateY(-2px); color: var(--gold-dark); }
.quote-card { background: var(--paper); border: 1px solid var(--faint); padding: 44px 38px; text-align: center; box-shadow: var(--shadow); }

.quote-card small { font-family: 'Cormorant Garamond', Georgia, serif; color: #aaa; font-style: italic; font-size: 18px; }
.quote-card blockquote { margin: 14px 0 18px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 34px; line-height: 1.25; font-weight: 300; }
.quote-card span { color: #aaa; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }

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

@media (max-width: 980px) {
  .hero, .contact-grid { grid-template-columns: 1fr; }
  .hero-visual { max-width: 520px; }
  .package-grid { grid-template-columns: 1fr; }
  .studio-strip { grid-template-columns: 1fr; }
  .studio-strip div { border-right: 0; border-bottom: 1px solid var(--faint); }
  .studio-strip div:last-child { border-bottom: 0; }
}

@media (max-width: 720px) {
  .section-wrap, .nav { width: min(100% - 32px, 1100px); }
  .nav-links a:not(.nav-cta) { display: none; }
  .brand-logo { width: clamp(130px, 44vw, 190px); max-height: 48px; }
  .brand-main { font-size: 23px; }
  .brand-sub { font-size: 9px; }
  .hero { padding: 46px 0; gap: 34px; }
  h1 { font-size: clamp(48px, 15vw, 74px); }
  .hero-actions, .contact-actions, .social-row { flex-direction: column; }
  .btn, .social-link { width: 100%; }
  .hero-visual { min-height: auto; }
  .photo-stack { height: auto; display: grid; gap: 12px; }
  .photo-stack img { position: static; width: 100% !important; height: auto !important; }
  .photo-main, .photo-small.top, .photo-small.bottom { aspect-ratio: 3 / 4; }
  .services-intro, .packages-section, .why-section, .promo-section, .contact-section { padding: 46px 0; }
  .package-01 .package-media, .package-02 .package-media { aspect-ratio: 3 / 4; }
  .package-03 .package-media, .package-04 .package-media { aspect-ratio: 4 / 3; }
  .package-media img { height: 100%; object-fit: cover; }
  .package-content, .custom-card > div:not(.slideshow) { padding: 26px 22px; min-height: auto; }
  .package-footer { display: block; }
  .custom-card { grid-template-columns: 1fr; }
  .slideshow { min-height: 310px; }
  .promo-grid, .why-grid { grid-template-columns: 1fr; }
  .footer { flex-direction: column; text-align: center; }
}
`;

export default App;
