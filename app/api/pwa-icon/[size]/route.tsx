// src/app/api/pwa-icon/[size]/route.tsx
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const dim = size === '512' ? 512 : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#FACC15',
          border: `${Math.round(dim * 0.05)}px solid #000000`,
          borderRadius: `${Math.round(dim * 0.22)}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: Math.round(dim * 0.45), lineHeight: 1 }}>🚕</div>
        <div
          style={{
            fontSize: Math.round(dim * 0.13),
            fontWeight: 900,
            color: '#000000',
            marginTop: Math.round(dim * 0.04),
            letterSpacing: '-0.03em',
          }}
        >
          HONKSAFE
        </div>
      </div>
    ),
    {
      width: dim,
      height: dim,
    }
  );
}