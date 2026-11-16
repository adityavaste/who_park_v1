// app/icon-512x512.png/route.tsx
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
          border: '28px solid #000000',
          borderRadius: '96px',
        }}
      >
        <div style={{ fontSize: 220, lineHeight: 1 }}>🚕</div>
        <div
          style={{
            marginTop: 20,
            fontSize: 64,
            fontWeight: 900,
            color: '#000000',
            letterSpacing: '0.06em',
          }}
        >
          WHO PARK
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}