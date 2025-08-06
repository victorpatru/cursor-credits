import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface HackathonCodeEmailProps {
  firstName?: string;
  redemptionLink?: string;
  eventName?: string;
}

export const HackathonCodeEmail = ({
  firstName = 'Participant',
  redemptionLink = 'https://cursor.com/redeem/ABC-123',
  eventName = 'Hackathon Event',
}: HackathonCodeEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>Your hackathon credits are ready!</Preview>
      <Container style={container}>
        <Section style={logoContainer}>
          {/* You can replace this with your event/company logo */}
          <Text style={logoText}>🚀 {eventName}</Text>
        </Section>
        <Heading style={h1}>Your hackathon credits are ready!</Heading>
        <Text style={heroText}>
          Hi {firstName}! Thank you for checking in to our event. Here's your personalized link to claim your free Cursor credits.
        </Text>

        <Section style={linkBox}>
          <Link href={redemptionLink} style={linkButton}>
            Claim Your Cursor Credits
          </Link>
        </Section>

        <Text style={text}>
          Simply click the button above to instantly claim your free Cursor credits for the hackathon.
        </Text>
        

        <Text style={text}>
          If you didn't attend this event or received this email by mistake, please contact our support team.
        </Text>

        <Section style={spacer}>
          <Text style={footerText}>
            Have an amazing time at the hackathon! 🎯
            <br />
            <br />
            Best regards,<br />
            The {eventName} Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

HackathonCodeEmail.PreviewProps = {
  firstName: 'Alex',
  redemptionLink: 'https://cursor.com/redeem/HAC-KT0N',
  eventName: 'Cursor Bucharest Hackathon',
} as HackathonCodeEmailProps;

export default HackathonCodeEmail;

// Styles adapted from Slack template
const main = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  margin: '0 auto',
  padding: '0px 20px',
  maxWidth: '600px',
};

const logoContainer = {
  marginTop: '32px',
  textAlign: 'center' as const,
};

const logoText = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#1d1c1d',
  margin: '0',
};

const h1 = {
  color: '#1d1c1d',
  fontSize: '36px',
  fontWeight: '700',
  margin: '30px 0',
  padding: '0',
  lineHeight: '42px',
  textAlign: 'center' as const,
};

const heroText = {
  fontSize: '18px',
  lineHeight: '26px',
  marginBottom: '30px',
  color: '#374151',
  textAlign: 'center' as const,
};

const linkBox = {
  textAlign: 'center' as const,
  marginBottom: '30px',
  padding: '20px',
};

const linkButton = {
  backgroundColor: '#007ee6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  border: 'none',
  cursor: 'pointer',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const spacer = {
  marginTop: '40px',
  marginBottom: '40px',
};

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '20px',
  textAlign: 'center' as const,
  marginBottom: '50px',
};