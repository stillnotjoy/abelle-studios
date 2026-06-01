.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-logo {
  width: 54px;
  height: 54px;
  object-fit: contain;
  display: block;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.social-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.social-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid rgba(17,17,17,.08);
  color: #444;
  font-size: 13px;
}

.social-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #111;
}

.social-icon svg,
.footer-social-link svg {
  width: 18px;
  height: 18px;
  display: block;
}

.footer-socials {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-social-link {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255,255,255,.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #f4f2ef;
}

.footer-social-link:hover,
.social-link:hover {
  transform: translateY(-2px);
}