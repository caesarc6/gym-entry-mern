import { Container } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/card";
import { landingDarkMainCanvas } from "../lib/homeLandingDarkTheme";
import { cn } from "../lib/utils";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    <div className="space-y-3 text-sm leading-6 text-muted-foreground">
      {children}
    </div>
  </section>
);

const PrivacyPolicy = () => {
  return (
    <div
      className={cn(
        "w-full min-h-[100dvh] bg-white bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/80 pb-12",
        landingDarkMainCanvas
      )}
    >
      <Container maxW="container.md" py={12} className="pt-[calc(88px+env(safe-area-inset-top))]">
        <Card variant="mixed" className="p-6 sm:p-8">
          <div className="mb-8 space-y-3">
            <Link to="/" className="text-sm font-medium text-primary hover:underline">
              Back to Ethereal Gains
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: April 27, 2026
            </p>
          </div>

          <div className="space-y-8">
            <Section title="Overview">
              <p>
                Ethereal Gains helps users track gym activity, profiles, workouts,
                analytics, and related fitness information. This Privacy Policy
                explains what information we collect, how we use it, and the choices
                you have when using our website and app.
              </p>
            </Section>

            <Section title="Information We Collect">
              <p>
                We may collect account information such as your name, email address,
                profile photo, and authentication provider details when you create an
                account or sign in.
              </p>
              <p>
                We may collect fitness and app activity information that you choose
                to enter, including gym entries, workouts, profile details, trainer
                or client relationships, analytics, notifications, and settings.
              </p>
              <p>
                We may collect technical information such as device type, browser,
                app version, log data, and general usage information to keep the
                service secure and improve performance.
              </p>
            </Section>

            <Section title="Google Sign-In">
              <p>
                If you sign in with Google, we use Google OAuth through Supabase
                Authentication. We request basic profile information such as your
                name, email address, and profile image so we can create and secure
                your Ethereal Gains account.
              </p>
              <p>
                We do not request permission to post to your Google account, read
                your emails, access your files, or manage your Google services.
              </p>
            </Section>

            <Section title="How We Use Information">
              <p>
                We use your information to provide and personalize the service,
                authenticate your account, display your profile, save your fitness
                activity, support trainer and client features, improve reliability,
                prevent abuse, and communicate important service updates.
              </p>
            </Section>

            <Section title="How We Share Information">
              <p>
                We do not sell your personal information. We may share information
                with service providers that help us operate the app, such as
                authentication, hosting, database, analytics, and infrastructure
                providers. These providers are only used to support Ethereal Gains.
              </p>
              <p>
                We may also disclose information if required by law, to protect the
                rights and safety of users, or to investigate fraud, abuse, or
                security issues.
              </p>
            </Section>

            <Section title="Your Choices">
              <p>
                You can update account details and privacy settings in the app. You
                can also choose what profile and activity information you add to the
                service. If you want to request account deletion or data access,
                contact us using the information below.
              </p>
            </Section>

            <Section title="Data Security">
              <p>
                We use reasonable technical and organizational safeguards to protect
                your information. No online service can guarantee complete security,
                so you should use a strong password and keep your account credentials
                private.
              </p>
            </Section>

            <Section title="Children's Privacy">
              <p>
                Ethereal Gains is not intended for children under 13. We do not
                knowingly collect personal information from children under 13.
              </p>
            </Section>

            <Section title="Changes To This Policy">
              <p>
                We may update this Privacy Policy from time to time. When we make
                material changes, we will update the date above and may provide
                additional notice in the app.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                If you have questions about this Privacy Policy or your data, contact
                us at{" "}
                <a
                  href="mailto:support@etherealgains.com"
                  className="font-medium text-primary hover:underline"
                >
                  support@etherealgains.com
                </a>
                .
              </p>
            </Section>
          </div>
        </Card>
      </Container>
    </div>
  );
};

export default PrivacyPolicy;
