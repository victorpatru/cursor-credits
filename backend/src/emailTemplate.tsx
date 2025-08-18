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
} from "@react-email/components";

export function HackathonCodeEmail({
  name,
  redemptionLink = "https://cursor.com/redeem/ABC-123",
  eventName = "Hackathon Event",
}: { name?: string; redemptionLink?: string; eventName?: string }) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>Your hackathon credits are ready!</Preview>
        <Container style={container}>
          <Section style={logoContainer}>
            <Text style={logoText}>{eventName}</Text>
          </Section>
          <Heading style={h1}>Your hackathon credits are ready!</Heading>
          <Text style={heroText}>
            Hi {name ?? "there"}! Thank you for checking in to our event. Here's your personalized link to redeem your Cursor credits.
          </Text>

          <Section style={linkBox}>
            <Link href={redemptionLink} style={linkButton}>
              Redeem your credits
            </Link>
          </Section>

          <Text style={text}>
            Simply click the button above to instantly redeem your Cursor credits for the hackathon.
          </Text>

          <Text style={text}>
            If you didn't attend this event or received this email by mistake, please just ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "0px 20px",
  maxWidth: "600px",
};

const logoContainer = {
  marginTop: "32px",
  textAlign: "center" as const,
};

const logoText = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#1d1c1d",
  margin: "0",
};

const h1 = {
  color: "#1d1c1d",
  fontSize: "36px",
  fontWeight: "700",
  margin: "30px 0",
  padding: "0",
  lineHeight: "42px",
  textAlign: "center" as const,
};

const heroText = {
  fontSize: "18px",
  lineHeight: "26px",
  marginBottom: "30px",
  color: "#374151",
  textAlign: "center" as const,
};

const linkBox = {
  textAlign: "center" as const,
  marginBottom: "30px",
  padding: "20px",
};

const linkButton = {
  backgroundColor: "#6E54D7",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
  border: "none",
  cursor: "pointer",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  marginBottom: "16px",
  textAlign: "center" as const,
};


