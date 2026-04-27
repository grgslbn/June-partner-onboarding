import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Markdown,
  Preview,
  Section,
  Text,
} from '@react-email/components';

type Partner = {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
};

type Lead = {
  first_name: string;
  last_name: string;
  email: string;
  confirmation_id: string;
};

type Props = {
  partner: Partner;
  lead: Lead;
  body: string; // already variable-substituted Markdown
  shopName?: string;
  repName?: string;
  locale: string;
};

export function ConfirmationEmail({ partner, lead, body, locale }: Props) {
  const primary = partner.primary_color ?? '#1a56db';

  return (
    <Html lang={locale}>
      <Head />
      <Preview>
        {`Confirmation ${lead.confirmation_id} — ${partner.name}`}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Branded header */}
          <Section style={{ ...styles.header, backgroundColor: primary }}>
            {partner.logo_url ? (
              <Img
                src={partner.logo_url}
                height={40}
                alt={partner.name}
                style={{ display: 'block' }}
              />
            ) : (
              <Text style={styles.headerText}>{partner.name}</Text>
            )}
          </Section>

          {/* Body — rendered Markdown */}
          <Section style={styles.bodySection}>
            <Markdown>{body}</Markdown>
          </Section>

          <Hr style={styles.hr} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Référence : {lead.confirmation_id}
            </Text>
            <Text style={styles.footerText}>
              June Energy —{' '}
              <a href="mailto:info@june.energy" style={{ color: '#9ca3af' }}>
                info@june.energy
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#f3f4f6',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    padding: '32px 0',
  },
  container: {
    maxWidth: 600,
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden' as const,
  },
  header: {
    padding: '24px 32px',
  },
  headerText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
  },
  bodySection: {
    padding: '32px 32px 24px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '0 32px',
  },
  footer: {
    padding: '16px 32px 32px',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    margin: '4px 0 0',
  },
} as const;
