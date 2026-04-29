import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
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
  email: string;
  confirmation_id: string;
};

type Props = {
  partner: Partner;
  lead: Lead;
  stripeUrl: string;
  locale: string;
  leadId: string;
  siteUrl: string;
};

const I18N = {
  fr: {
    preview: (firstName: string, partner: string) =>
      `${firstName}, finalisez votre contrat June chez ${partner}`,
    subject: (firstName: string, partner: string) =>
      `${firstName}, finalisez votre contrat June chez ${partner}`,
    greeting: (firstName: string, partner: string) =>
      `Bonjour ${firstName}, merci d'avoir rejoint June chez ${partner}.`,
    action:
      "Pour activer votre changement de fournisseur, il vous reste une dernière étape : finaliser votre paiement et signer le mandat SEPA. Cela ne prend que quelques minutes.",
    cta: 'Finaliser mon contrat',
    stripeNote:
      'Vous serez redirigé vers notre partenaire de paiement Stripe, où vous pourrez choisir votre moyen de paiement et confirmer votre adresse de livraison.',
    refLabel: 'Référence :',
    contact: 'Contact :',
    address: 'June Energy SA — Bruxelles, Belgique',
    unsubscribe: (partner: string) =>
      `Vous recevez cet email car vous vous êtes inscrit via ${partner}. Si vous n'êtes pas à l'origine de cette demande, merci de nous le signaler à`,
    unsubscribeLink: 'info@june.energy',
  },
  nl: {
    preview: (firstName: string, partner: string) =>
      `${firstName}, voltooi uw June-contract bij ${partner}`,
    subject: (firstName: string, partner: string) =>
      `${firstName}, voltooi uw June-contract bij ${partner}`,
    greeting: (firstName: string, partner: string) =>
      `Hallo ${firstName}, bedankt dat u bij ${partner} voor June heeft gekozen.`,
    action:
      'Om uw leverancierswissel te activeren, is er nog één stap: uw betaling afronden en het SEPA-mandaat ondertekenen. Dit duurt slechts een paar minuten.',
    cta: 'Mijn contract voltooien',
    stripeNote:
      'U wordt doorgestuurd naar onze betalingspartner Stripe, waar u uw betaalmethode kunt kiezen en uw leveringsadres kunt bevestigen.',
    refLabel: 'Referentie:',
    contact: 'Contact:',
    address: 'June Energy NV — Brussel, België',
    unsubscribe: (partner: string) =>
      `U ontvangt deze e-mail omdat u zich heeft ingeschreven via ${partner}. Als u deze aanvraag niet heeft gedaan, meld dit dan aan`,
    unsubscribeLink: 'info@june.energy',
  },
  en: {
    preview: (firstName: string, partner: string) =>
      `${firstName}, complete your June contract via ${partner}`,
    subject: (firstName: string, partner: string) =>
      `${firstName}, complete your June contract via ${partner}`,
    greeting: (firstName: string, partner: string) =>
      `Hello ${firstName}, thank you for joining June via ${partner}.`,
    action:
      'To activate your energy switch, there is one final step: complete your payment and sign the SEPA mandate. It only takes a few minutes.',
    cta: 'Complete my contract',
    stripeNote:
      'You will be redirected to our payment partner Stripe, where you can choose your payment method and confirm your delivery address.',
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

export function SelfOnboardingEmail({ partner, lead, stripeUrl, locale, leadId, siteUrl }: Props) {
  const primary = partner.primary_color ?? '#1a56db';
  const strings = t(locale);
  const unsubscribeUrl = `${siteUrl}/${locale}/unsubscribe/${leadId}`;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{strings.preview(lead.first_name, partner.name)}</Preview>
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

          {/* Action paragraph */}
          <Section style={{ ...styles.section, paddingTop: 12 }}>
            <Text style={styles.body2}>{strings.action}</Text>
          </Section>

          {/* CTA button */}
          <Section style={{ ...styles.section, paddingTop: 20 }}>
            <Link
              href={stripeUrl}
              style={{
                ...styles.ctaLink,
                backgroundColor: primary,
                display: 'block',
                textAlign: 'center' as const,
              }}
            >
              {strings.cta}
            </Link>
          </Section>

          {/* Stripe expectation note */}
          <Section style={{ ...styles.section, paddingTop: 16, paddingBottom: 24 }}>
            <Text style={styles.stripeNote}>{strings.stripeNote}</Text>
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
  },
  ctaLink: {
    padding: '14px 24px',
    borderRadius: 6,
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 16,
  },
  stripeNote: {
    fontSize: 13,
    lineHeight: '20px',
    color: '#6b7280',
    margin: 0,
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
