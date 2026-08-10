import { useState } from "react";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { supabase } from "../lib/supabaseClient";

function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSigningIn, setIsSigningIn] =
    useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanEmail = email
      .trim()
      .toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        "Enter your administrator email and password."
      );

      return;
    }

    try {
      setIsSigningIn(true);
      setError("");

      const {
        data,
        error: signInError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: cleanEmail,
            password,
          }
        );

      if (signInError) {
        throw signInError;
      }

      if (!data.session) {
        throw new Error(
          "The login succeeded, but no session was returned."
        );
      }

      onSignedIn?.(data.session);
    } catch (signInError) {
      console.error(
        "Admin login failed:",
        signInError
      );

      setError(
        signInError.message ===
          "Invalid login credentials"
          ? "The email or password is incorrect."
          : signInError.message ||
              "Could not sign in. Please try again."
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="crm-login-page">
      <section className="crm-login-brand-panel">
        <div className="crm-login-brand-content">
          <img
            src="/assets/logo-full-black.png"
            alt="Abelle Studios"
            className="crm-login-logo"
          />

          <p className="crm-login-brand-label">
            Studio CRM
          </p>

          <h1>
            Your studio,
            <br />
            beautifully organised.
          </h1>

          <p className="crm-login-brand-description">
            Manage bookings, customers,
            payments, schedules and future
            marketing from one secure
            workspace.
          </p>

          <div className="crm-login-feature-list">
            <span>
              Secure administrator access
            </span>

            <span>
              Connected booking management
            </span>

            <span>
              Customer and payment tracking
            </span>
          </div>
        </div>
      </section>

      <section className="crm-login-form-panel">
        <div className="crm-login-card">
          <div className="crm-login-heading">
            <p>Abelle Studios Admin</p>

            <h2>Welcome back</h2>

            <span>
              Sign in to open your studio
              workspace.
            </span>
          </div>

          <form
            className="crm-login-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>Administrator Email</span>

              <div className="crm-login-input">
                <Mail
                  size={18}
                  strokeWidth={1.7}
                />

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isSigningIn}
                  required
                />
              </div>
            </label>

            <label>
              <span>Password</span>

              <div className="crm-login-input">
                <LockKeyhole
                  size={18}
                  strokeWidth={1.7}
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSigningIn}
                  required
                />

                <button
                  type="button"
                  className="crm-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  disabled={isSigningIn}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                      strokeWidth={1.7}
                    />
                  ) : (
                    <Eye
                      size={18}
                      strokeWidth={1.7}
                    />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div
                className="crm-login-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="crm-login-submit"
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="crm-icon-spinning"
                  />

                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="crm-login-security-note">
            This area is restricted to
            authorised Abelle Studios
            administrators.
          </p>
        </div>
      </section>
    </main>
  );
}

export default AdminLogin;