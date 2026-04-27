import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
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
  customBody?: string; // partner-configured Markdown (optional, variable-substituted)
  magicLink?: string;
  shopName?: string;
  repName?: string;
  locale: string;
  leadId: string;
  siteUrl: string;
};

const I18N = {
  fr: {
    preview: (ref: string, partner: string) =>
      `Confirmation ${ref} — ${partner} × June`,
    greeting: (firstName: string, partner: string) =>
      `Bonjour ${firstName},\n\nMerci pour votre inscription chez ${partner} × June. Nous vous contacterons sous 48h pour finaliser votre changement de fournisseur d'énergie.`,
    magicLinkLabel: 'Finaliser votre dossier (IBAN)',
    magicLinkNote:
      'Pour compléter votre dossier, veuillez renseigner vos coordonnées bancaires via le lien ci-dessous :',
    nextTitle: 'Que se passe-t-il maintenant ?',
    nextSteps: [
      '✅  Votre demande est confirmée.',
      '📞  Notre équipe vous contacte sous 48h.',
      "⚡  Votre changement de fournisseur s'effectue automatiquement en arrière-plan.",
    ],
    signoff: "À très vite,\nL'équipe June Energy",
    refLabel: 'Référence :',
    contact: 'Contact :',
    address: 'June Energy SA — Bruxelles, Belgique',
    unsubscribe: (partner: string) =>
      `Vous recevez cet email car vous vous êtes inscrit via ${partner}. Si vous n'êtes pas à l'origine de cette demande, merci de nous le signaler à`,
    unsubscribeLink: 'info@june.energy',
  },
  nl: {
    preview: (ref: string, partner: string) =>
      `Bevestiging ${ref} — ${partner} × June`,
    greeting: (firstName: string, partner: string) =>
      `Hallo ${firstName},\n\nBedankt voor uw inschrijving bij ${partner} × June. We nemen binnen 48u contact met u op om uw leverancierswissel te finaliseren.`,
    magicLinkLabel: 'Dossier vervolledigen (IBAN)',
    magicLinkNote:
      'Om uw dossier te vervolledigen, gelieve uw bankgegevens in te vullen via onderstaande link:',
    nextTitle: 'Wat gebeurt er nu?',
    nextSteps: [
      '✅  Uw aanvraag is bevestigd.',
      '📞  Ons team neemt binnen 48u contact met u op.',
      '⚡  Uw leverancierswissel verloopt automatisch op de achtergrond.',
    ],
    signoff: 'Tot binnenkort,\nHet June Energy team',
    refLabel: 'Referentie:',
    contact: 'Contact:',
    address: 'June Energy NV — Brussel, België',
    unsubscribe: (partner: string) =>
      `U ontvangt deze e-mail omdat u zich heeft ingeschreven via ${partner}. Als u deze aanvraag niet heeft gedaan, meld dit dan aan`,
    unsubscribeLink: 'info@june.energy',
  },
  en: {
    preview: (ref: string, partner: string) =>
      `Confirmation ${ref} — ${partner} × June`,
    greeting: (firstName: string, partner: string) =>
      `Hello ${firstName},\n\nThank you for signing up with ${partner} × June. We'll contact you within 48h to finalise your energy switch.`,
    magicLinkLabel: 'Complete your file (IBAN)',
    magicLinkNote:
      'To complete your file, please fill in your bank details via the link below:',
    nextTitle: 'What happens next?',
    nextSteps: [
      '✅  Your request is confirmed.',
      '📞  Our team will contact you within 48h.',
      '⚡  Your energy switch happens automatically in the background.',
    ],
    signoff: 'See you soon,\nThe June Energy team',
    refLabel: 'Reference:',
    contact: 'Contact:',
    address: 'June Energy SA — Brussels, Belgium',
    unsubscribe: (partner: string) =>
      `You are receiving this email because you signed up via ${partner}. If you did not initiate this request, please let us know at`,
    unsubscribeLink: 'info@june.energy',
  },
} as const;

type Locale = keyof typeof I18N;

function t(locale: string): (typeof I18N)[Locale] {
  return I18N[(locale as Locale) in I18N ? (locale as Locale) : 'fr'];
}

export function ConfirmationEmail({
  partner,
  lead,
  customBody,
  magicLink,
  locale,
  leadId,
  siteUrl,
}: Props) {
  const primary = partner.primary_color ?? '#1a56db';
  const strings = t(locale);
  const unsubscribeUrl = `${siteUrl}/${locale}/unsubscribe/${leadId}`;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>
        {strings.preview(lead.confirmation_id, partner.name)}
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
              <Text style={styles.headerText}>{partner.name} × June</Text>
            )}
          </Section>

          {/* Greeting */}
          <Section style={styles.section}>
            <Text style={styles.body2}>
              {strings.greeting(lead.first_name, partner.name)}
            </Text>
          </Section>

          {/* Magic link (deferred IBAN) */}
          {magicLink && (
            <Section style={{ ...styles.section, paddingTop: 0 }}>
              <Text style={styles.body2}>{strings.magicLinkNote}</Text>
              <Link href={magicLink} style={{ ...styles.ctaLink, backgroundColor: primary }}>
                {strings.magicLinkLabel}
              </Link>
            </Section>
          )}

          {/* Partner-customised body (optional) */}
          {customBody && (
            <Section style={{ ...styles.section, paddingTop: 0 }}>
              <Markdown>{customBody}</Markdown>
            </Section>
          )}

          {/* What happens next */}
          <Section style={{ ...styles.section, paddingTop: 0, backgroundColor: '#f9fafb', borderRadius: 6, margin: '0 32px 24px' }}>
            <Text style={styles.nextTitle}>{strings.nextTitle}</Text>
            {strings.nextSteps.map((step) => (
              <Text key={step} style={styles.nextStep}>{step}</Text>
            ))}
          </Section>

          {/* Sign-off */}
          <Section style={{ ...styles.section, paddingTop: 0 }}>
            <Text style={styles.body2}>{strings.signoff}</Text>
          </Section>

          <Hr style={styles.hr} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              {strings.refLabel} {lead.confirmation_id}
            </Text>
            <Text style={styles.footerText}>
              {strings.contact}{' '}
              <Link href="mailto:info@june.energy" style={styles.footerLink}>
                info@june.energy
              </Link>
            </Text>
            <Text style={styles.footerText}>{strings.address}</Text>
            <Hr style={{ ...styles.hr, margin: '12px 0' }} />
            <Text style={styles.footerText}>
              {strings.unsubscribe(partner.name)}{' '}
              <Link href="mailto:info@june.energy" style={styles.footerLink}>
                {strings.unsubscribeLink}
              </Link>
              {'. '}
              <Link href={unsubscribeUrl} style={styles.footerLink}>
                En savoir plus
              </Link>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
  section: {
    padding: '24px 32px 0',
  },
  body2: {
    fontSize: 15,
    lineHeight: '24px',
    color: '#1f2937',
    margin: 0,
    whiteSpace: 'pre-line' as const,
  },
  ctaLink: {
    display: 'inline-block',
    padding: '12px 24px',
    borderRadius: 6,
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
    marginTop: 12,
  },
  nextTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    margin: '16px 16px 8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  nextStep: {
    fontSize: 14,
    lineHeight: '22px',
    color: '#374151',
    margin: '0 16px 6px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 32px 0',
  },
  footer: {
    padding: '16px 32px 28px',
  },
  footerText: {
    fontSize: 11,
    color: '#9ca3af',
    margin: '3px 0',
    lineHeight: '16px',
  },
  footerLink: {
    color: '#9ca3af',
  },
} as const;
