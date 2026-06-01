import { useState } from "react";

const messengerLink = "https://m.me/254698671071327";
const phoneNumber = "+63 993 009 4179";
const address = "Rm 208, 2nd Floor, E.I. Building, Calle II de Febrero, Tradetown, Funda-Dalipe, San Jose, Antique";

const packages = [
  {
    title: "Personal Portraits",
    price: "₱499",
    time: "30–45 mins",
    image: "/assets/personal-portraits.svg",
    description: "A simple studio portrait session for clean, confident, personal photos.",
    includes: [
      "Guided photoshoot",
      "1 chosen portrait in A4 print + 2 wallet-size prints",
      "Enhanced soft copies sent via Google Drive",
      "Professional studio background",
      "Makeup, styling, and costume options available by request",
    ],
  },
  {
    title: "Duo Portraits",
    price: "₱899",
    time: "30–45 mins",
    image: "/assets/duo-portraits.svg",
    description: "For couples, best friends, siblings, or two-person creative portraits.",
    includes: [
      "Guided photoshoot",
      "1 chosen portrait in A4 print + 2 4R prints + 2 wallet-size prints",
      "Enhanced soft copies sent via Google Drive",
      "Professional studio background",
      "Makeup, styling, and costume options available by request",
    ],
  },
  {
    title: "Maternity Shoot",
    price: "₱999",
    time: "45–60 mins",
    image: "/assets/maternity-shoot.svg",
    description: "A soft and meaningful session for mothers who want to preserve this season beautifully.",
    includes: [
      "Guided photoshoot",
      "1 chosen portrait in A4 print with basic frame + 2 4R copies + 2 wallet-size prints",
      "Soft copies sent via email",
      "Professional studio background",
      "Makeup, styling, and costume options available by request",
    ],
  },
  {
    title: "Barkada Shoot",
    price: "₱999",
    time: "30–45 mins",
    image: "/assets/barkada-shoot.svg",
    description: "Fun, relaxed studio portraits for your favourite people and shared memories.",
    includes: [
      "Good for 3–4 people",
      "Professional studio background and lighting",
      "1 chosen shot in A4 print with basic frame + 2 4R copies or 6 wallet-size copies",
      "Soft copies sent via email",
    ],
  },
  {
    title: "Family Portrait",
    price: "₱1,299",
    time: "45–60 mins",
    image: "/assets/family-portrait.svg",
    description: "A warm studio session made for families who want something timeless and display-ready.",
    includes: [
      "Good for 5–6 people",
      "2 chosen portraits in A4 print with basic frame + 2 4R copies + 2 wallet-size copies",
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
  "Wedding and Pre-wedding Photoshoot",
  "Graduation Photoshoot",
  "Food / Product Photography",
  "Resume Headshots",
  "Rush ID Photos",
  "Special Event / Ask Us",
];

function App() {
  const [selectedPackage, setSelectedPackage] = useState(null);

  return (
    <main className="site-shell">
      <style>{styles}</style>

      <nav className="nav">
        <a href="#top" className="brand" aria-label="Abelle Studios home">
          <span className="brand-mark">AS</span>
          <span>
            <strong>Abelle Studios</strong>
            <small>Dalipe, San Jose, Antique</small>
          </span>
        </a>
        <div className="nav-links">
          <a href="#packages">Packages</a>
          <a href="#services">Services</a>
          <a href={messengerLink} target="_blank" rel="noreferrer" className="nav-cta">
            Message Us
          </a>
        </div>
      </nav>

      <section id="top" className="hero section">
        <div className="hero-copy">
          <p className="eyebrow">Creative portrait studio</p>
          <h1>All your memories, create it here.</h1>
          <p className="hero-text">
            Beautiful, guided studio sessions for portraits, families, barkadas, milestones, and creative ideas — made simple, warm, and display-ready.
          </p>
          <div className="hero-actions">
            <a href="#packages" className="button primary">View packages</a>
            <a href={messengerLink} target="_blank" rel="noreferrer" className="button secondary">Book through Messenger</a>
          </div>
          <div className="quick-info">
            <span>Studio portraits</span>
            <span>Soft copies</span>
            <span>Print options</span>
          </div>
        </div>

        <button className="hero-card" onClick={() => setSelectedPackage({ title: "Abelle Studios Price Guide", image: "/assets/abelle-overview.svg" })}>
          <img src="/assets/abelle-overview.svg" alt="Abelle Studios package overview" />
          <span>Tap to view full guide</span>
        </button>
      </section>

      <section id="packages" className="section packages-section">
        <div className="section-heading">
          <p className="eyebrow">Starting rates</p>
          <h2>Choose the session that fits your moment.</h2>
          <p>Each package includes a guided studio session, selected prints, and enhanced soft copies.</p>
        </div>

        <div className="package-grid">
          {packages.map((item) => (
            <article className="package-card" key={item.title}>
              <button className="package-image" onClick={() => setSelectedPackage(item)}>
                <img src={item.image} alt={`${item.title} price guide`} />
              </button>
              <div className="package-body">
                <div className="package-topline">
                  <p>{item.time}</p>
                  <strong>Starts at {item.price}</strong>
                </div>
                <h3>{item.title}</h3>
                <p className="package-description">{item.description}</p>
                <ul>
                  {item.includes.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <a href={messengerLink} target="_blank" rel="noreferrer" className="text-link">
                  Inquire / Book this session →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="services" className="section services-section">
        <div className="soft-card">
          <div>
            <p className="eyebrow">More ways to create</p>
            <h2>Have something else in mind?</h2>
            <p>
              Aside from our fixed packages, we also accept creative, product, ID, graduation, event, and special shoots. Message us your idea and we’ll help you plan the simplest package for it.
            </p>
            <a href={messengerLink} target="_blank" rel="noreferrer" className="button primary">Ask for a custom quote</a>
          </div>
          <div className="service-list">
            {services.map((service) => (
              <span key={service}>{service}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section contact-section">
        <div className="contact-card">
          <p className="eyebrow">Visit / Book</p>
          <h2>Ready when you are.</h2>
          <p className="address">{address}</p>
          <p className="phone">{phoneNumber}</p>
          <div className="contact-actions">
            <a href={messengerLink} target="_blank" rel="noreferrer" className="button primary">Message on Messenger</a>
            <a href={`tel:${phoneNumber.replace(/\s/g, "")}`} className="button secondary">Call the studio</a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Abelle Studios. All your ideas, create it here.</p>
      </footer>

      {selectedPackage && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={`${selectedPackage.title} full price guide`} onClick={() => setSelectedPackage(null)}>
          <button className="modal-close" onClick={() => setSelectedPackage(null)} aria-label="Close preview">×</button>
          <img src={selectedPackage.image} alt={`${selectedPackage.title} full price guide`} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </main>
  );
}

const styles = `
  :root {
    --ink: #151515;
    --muted: #66615b;
    --line: #ded9d2;
    --cream: #f5f2ed;
    --paper: #fbfaf7;
    --gold: #b79a5b;
    --charcoal: #0f0f0f;
    --shadow: 0 24px 70px rgba(20, 20, 20, 0.10);
  }

  * { box-sizing: border-box; }

  html { scroll-behavior: smooth; }

  body {
    margin: 0;
    background:
      radial-gradient(circle at top left, rgba(183,154,91,0.16), transparent 34rem),
      linear-gradient(180deg, #f7f4ee 0%, #fbfaf7 45%, #f1eee8 100%);
    color: var(--ink);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  a { color: inherit; text-decoration: none; }

  .site-shell { min-height: 100vh; }

  .nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem clamp(1rem, 4vw, 4rem);
    background: rgba(251, 250, 247, 0.82);
    border-bottom: 1px solid rgba(222, 217, 210, 0.8);
    backdrop-filter: blur(16px);
  }

  .brand { display: flex; align-items: center; gap: 0.85rem; }

  .brand-mark {
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    place-items: center;
    border: 1px solid var(--ink);
    background: var(--charcoal);
    color: white;
    font-family: Georgia, serif;
    letter-spacing: 0.08em;
  }

  .brand strong { display: block; font-family: Georgia, serif; font-weight: 500; font-size: 1.05rem; }
  .brand small { display: block; color: var(--muted); font-size: 0.72rem; margin-top: 0.1rem; }

  .nav-links { display: flex; align-items: center; gap: 1rem; color: var(--muted); font-size: 0.92rem; }
  .nav-cta { color: var(--ink); border-bottom: 1px solid var(--ink); padding-bottom: 0.12rem; }

  .section { padding: clamp(3.5rem, 8vw, 7rem) clamp(1rem, 4vw, 4rem); }

  .hero {
    min-height: calc(100vh - 5rem);
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 30rem);
    align-items: center;
    gap: clamp(2rem, 6vw, 5rem);
    max-width: 1180px;
    margin: 0 auto;
  }

  .eyebrow {
    margin: 0 0 0.9rem;
    color: var(--gold);
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 700;
  }

  h1, h2, h3 {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 500;
    line-height: 0.98;
    letter-spacing: -0.04em;
  }

  h1 { margin: 0; font-size: clamp(3.4rem, 9vw, 7.5rem); max-width: 12ch; }
  h2 { margin: 0; font-size: clamp(2.2rem, 5vw, 4.2rem); max-width: 13ch; }
  h3 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.6rem); }

  .hero-text, .section-heading p, .soft-card p, .contact-card p {
    color: var(--muted);
    font-size: clamp(1rem, 1.5vw, 1.14rem);
    line-height: 1.75;
  }

  .hero-text { max-width: 36rem; margin: 1.5rem 0 0; }

  .hero-actions, .contact-actions { display: flex; gap: 0.85rem; flex-wrap: wrap; margin-top: 2rem; }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3.1rem;
    padding: 0 1.25rem;
    border-radius: 999px;
    border: 1px solid var(--ink);
    font-weight: 700;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  }

  .button:hover { transform: translateY(-2px); box-shadow: 0 14px 35px rgba(0,0,0,0.12); }
  .button.primary { background: var(--charcoal); color: white; }
  .button.secondary { background: transparent; color: var(--ink); }

  .quick-info { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1.8rem; }
  .quick-info span {
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--muted);
    background: rgba(255,255,255,0.52);
    font-size: 0.83rem;
  }

  .hero-card {
    appearance: none;
    border: 0;
    background: transparent;
    cursor: pointer;
    transform: rotate(2deg);
  }

  .hero-card img, .package-image img {
    display: block;
    width: 100%;
    border-radius: 1.4rem;
    box-shadow: var(--shadow);
    border: 1px solid rgba(0,0,0,0.06);
  }

  .hero-card span {
    display: inline-block;
    margin-top: 1rem;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .section-heading {
    max-width: 1180px;
    margin: 0 auto 2.4rem;
    display: grid;
    grid-template-columns: 0.9fr 1fr;
    gap: 2rem;
    align-items: end;
  }

  .section-heading p:last-child { max-width: 34rem; margin: 0; }

  .package-grid {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    gap: 1.2rem;
  }

  .package-card {
    display: grid;
    grid-template-columns: minmax(17rem, 0.9fr) minmax(0, 1.1fr);
    gap: clamp(1.2rem, 3vw, 2.5rem);
    align-items: center;
    padding: clamp(1rem, 2vw, 1.5rem);
    border: 1px solid var(--line);
    border-radius: 2rem;
    background: rgba(255,255,255,0.66);
    box-shadow: 0 18px 50px rgba(0,0,0,0.055);
  }

  .package-image { border: 0; background: transparent; padding: 0; cursor: zoom-in; }

  .package-body { padding: 0.5rem clamp(0.2rem, 1vw, 1rem); }

  .package-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.85rem;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .package-topline p { margin: 0; }
  .package-topline strong { color: var(--ink); font-size: 1rem; }

  .package-description { color: var(--muted); line-height: 1.65; max-width: 40rem; }

  ul {
    margin: 1rem 0 1.35rem;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.55rem;
  }

  li { color: #2b2926; line-height: 1.45; }
  li::before { content: "✓"; color: var(--gold); font-weight: 900; margin-right: 0.5rem; }

  .text-link { font-weight: 800; border-bottom: 1px solid currentColor; padding-bottom: 0.12rem; }

  .soft-card, .contact-card {
    max-width: 1180px;
    margin: 0 auto;
    border-radius: 2.2rem;
    padding: clamp(1.4rem, 4vw, 3.5rem);
    background: var(--charcoal);
    color: white;
    box-shadow: var(--shadow);
  }

  .soft-card {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 2rem;
    align-items: start;
  }

  .soft-card p, .contact-card p { color: rgba(255,255,255,0.72); }
  .soft-card .button.primary, .contact-card .button.primary { background: white; color: var(--ink); border-color: white; }
  .contact-card .button.secondary { color: white; border-color: rgba(255,255,255,0.45); }

  .service-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .service-list span {
    padding: 0.75rem 0.95rem;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.86);
    font-size: 0.92rem;
  }

  .contact-section { padding-top: 0; }
  .contact-card { background: #ffffff; color: var(--ink); border: 1px solid var(--line); }
  .contact-card p { color: var(--muted); }
  .contact-card .button.primary { background: var(--charcoal); color: white; border-color: var(--charcoal); }
  .contact-card .button.secondary { color: var(--ink); border-color: var(--ink); }
  .address { max-width: 52rem; }
  .phone { font-weight: 800; color: var(--ink) !important; }

  .footer { padding: 2rem 1rem 3rem; text-align: center; color: var(--muted); }

  .modal {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(0,0,0,0.78);
    backdrop-filter: blur(8px);
  }

  .modal img {
    width: min(94vw, 820px);
    max-height: 88vh;
    object-fit: contain;
    border-radius: 1.2rem;
    box-shadow: 0 24px 90px rgba(0,0,0,0.45);
  }

  .modal-close {
    position: fixed;
    top: 1rem;
    right: 1rem;
    width: 3rem;
    height: 3rem;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.08);
    color: white;
    font-size: 2rem;
    cursor: pointer;
  }

  @media (max-width: 860px) {
    .nav { align-items: flex-start; }
    .nav-links a:not(.nav-cta) { display: none; }
    .hero { grid-template-columns: 1fr; min-height: auto; }
    .hero-card { transform: none; max-width: 32rem; justify-self: center; }
    .section-heading { grid-template-columns: 1fr; }
    .package-card { grid-template-columns: 1fr; }
    .soft-card { grid-template-columns: 1fr; }
  }

  @media (max-width: 560px) {
    .brand small { display: none; }
    .nav { padding: 0.85rem 1rem; }
    .brand-mark { width: 2.35rem; height: 2.35rem; }
    .section { padding-left: 1rem; padding-right: 1rem; }
    .hero-actions, .contact-actions { flex-direction: column; }
    .button { width: 100%; }
    .package-card, .soft-card, .contact-card { border-radius: 1.4rem; }
    .package-topline { align-items: flex-start; flex-direction: column; }
    h1 { font-size: 3.2rem; }
  }
`;

export default App;
