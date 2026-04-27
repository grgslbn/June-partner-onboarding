export default async function UnsubscribePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '32px 16px',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: '40px 32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <p style={{ fontSize: 32, margin: '0 0 16px' }}>ℹ️</p>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
          Cet email est transactionnel
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: '24px', marginBottom: 24 }}>
          Cet email fait suite à votre inscription chez June Energy. Il s&apos;agit
          d&apos;un email transactionnel lié à votre demande — il n&apos;est pas possible
          de s&apos;en désabonner.
        </p>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: '24px' }}>
          Pour toute question, contactez-nous à{' '}
          <a href="mailto:info@june.energy" style={{ color: '#1a56db' }}>
            info@june.energy
          </a>
        </p>
      </div>
    </main>
  );
}
