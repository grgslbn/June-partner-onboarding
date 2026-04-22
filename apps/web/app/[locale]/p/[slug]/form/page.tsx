// Stub — Briefing 05 replaces this with the real simple-preset form.
export default async function FormStubPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Form coming in Briefing 05</h1>
      <p>
        Locale: <code>{locale}</code>, partner slug: <code>{slug}</code>
      </p>
    </main>
  );
}
