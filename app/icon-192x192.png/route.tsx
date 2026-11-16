// app/icon-192x192.png/route.tsx
import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FACC15',
          border: '12px solid #000000',
          borderRadius: '36px',
        }}
      >
        <div style={{ fontSize: 84, lineHeight: 1 }}>🚕</div>
        <div
          style={{
            marginTop: 8,
            fontSize: 24,
            fontWeight: 900,
            color: '#000000',
            letterSpacing: '0.05em',
          }}
        >
          WHO PARK
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}