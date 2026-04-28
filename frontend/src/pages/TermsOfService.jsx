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

const TermsOfService = () => {
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
            <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: April 27, 2026
            </p>
          </div>

          <div className="space-y-8">
            <Section title="Agreement To These Terms">
              <p>
                These Terms of Service govern your access to and use of Ethereal
                Gains. By creating an account, signing in, or using the service, you
                agree to these Terms.
              </p>
            </Section>

            <Section title="The Service">
              <p>
                Ethereal Gains provides tools for gym entry tracking, fitness
                profiles, workouts, analytics, trainer and client workflows, and
                related account features. The service may change over time as we add,
                remove, or improve features.
              </p>
            </Section>

            <Section title="Accounts And Security">
              <p>
                You are responsible for keeping your account credentials secure and
                for activity that happens under your account. You agree to provide
                accurate information and to notify us if you believe your account has
                been accessed without permission.
              </p>
            </Section>

            <Section title="Acceptable Use">
              <p>
                You agree not to misuse the service, interfere with its operation,
                access accounts or data without authorization, upload malicious code,
                harass other users, or use Ethereal Gains for unlawful, harmful, or
                deceptive activity.
              </p>
            </Section>

            <Section title="User Content And Fitness Information">
              <p>
                You are responsible for the information you add to Ethereal Gains,
                including profile details, workouts, gym entries, and shared workout
                content. You should only add information that you have the right to
                use and share.
              </p>
              <p>
                Ethereal Gains is not a medical provider. Fitness information,
                analytics, and workout features are for general tracking and
                informational purposes only and are not medical advice. Consult a
                qualified professional before starting or changing a fitness program.
              </p>
            </Section>

            <Section title="Subscriptions, Payments, And Paid Features">
              <p>
                If paid features are offered, additional payment terms may apply.
                Prices, billing periods, renewals, cancellations, and refunds will be
                presented before purchase or in the applicable app store or payment
                provider flow.
              </p>
            </Section>

            <Section title="Privacy">
              <p>
                Our{" "}
                <Link
                  to="/privacy-policy"
                  className="font-medium text-primary hover:underline"
                >
                  Privacy Policy
                </Link>{" "}
                explains how we collect, use, and protect information when you use
                Ethereal Gains.
              </p>
            </Section>

            <Section title="Service Availability">
              <p>
                We work to keep Ethereal Gains available and reliable, but we do not
                guarantee uninterrupted service. The service may be unavailable due
                to maintenance, updates, outages, or events outside our control.
              </p>
            </Section>

            <Section title="Termination">
              <p>
                You may stop using the service at any time. We may suspend or
                terminate access if we believe you violated these Terms, created risk
                for the service or other users, or used the service unlawfully.
              </p>
            </Section>

            <Section title="Disclaimers And Limitation Of Liability">
              <p>
                Ethereal Gains is provided &quot;as is&quot; and &quot;as
                available.&quot; To the fullest extent permitted by law, we
                disclaim warranties and are not liable for indirect, incidental,
                special, consequential, or punitive damages arising from your use
                of the service.
              </p>
            </Section>

            <Section title="Changes To These Terms">
              <p>
                We may update these Terms from time to time. When we make material
                changes, we will update the date above and may provide additional
                notice in the app.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                If you have questions about these Terms, contact us at{" "}
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

export default TermsOfService;
