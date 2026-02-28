import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
        }}>
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}>
                    <span className="gradient-text">SAROTHI SHEBA</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Your ride, your way
                </p>
            </div>
            <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                afterSignInUrl="/"
                appearance={{
                    variables: {
                        colorPrimary: '#6C5CE7',
                        colorBackground: '#1A1A2E',
                        colorText: '#F0F0F5',
                        colorInputBackground: '#22223A',
                        colorInputText: '#F0F0F5',
                        borderRadius: '12px',
                    },
                }}
            />
        </div>
    );
}
