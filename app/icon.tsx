// src/app/icon.tsx
import { ImageResponse } from 'next/og';

export function generateImageMetadata() {
  return [
    { contentType: 'image/png', size: { width: 48, height: 48 }, id: 'small' },
    { contentType: 'image/png', size: { width: 192, height: 192 }, id: 'medium' },
    { contentType: 'image/png', size: { width: 512, height: 512 }, id: 'large' },
  ];
}

export default async function Icon({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dimension = id === 'small' ? 48 : id === 'medium' ? 192 : 512;
  const radius = Math.round(dimension * 0.22);
  const border = Math.max(2, Math.round(dimension * 0.06));
  const fontSize = Math.round(dimension * 0.56);

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
          borderRadius: `${radius}px`,
          border: `${border}px solid #0A0A0A`,
          color: '#0A0A0A',
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          fontFamily: 'sans-serif',
        }}
      >
        W
      </div>
    ),
    { width: dimension, height: dimension }
  );
}