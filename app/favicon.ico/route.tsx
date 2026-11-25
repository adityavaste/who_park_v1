// src/app/favicon.ico/route.ts
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FACC15',
          borderRadius: '10px',
          border: '3px solid #0A0A0A',
          color: '#0A0A0A',
          fontSize: '28px',
          fontWeight: 900,
          fontFamily: 'sans-serif',
        }}
      >
        W
      </div>
    ),
    {
      width: 48,
      height: 48,
    }
  );
}