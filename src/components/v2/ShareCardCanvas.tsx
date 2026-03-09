import React, { useRef, useEffect, useState } from 'react';
import { fromKg } from '../../../utils/unit';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PRInfo {
  exercise: string;
  maxWeightKg: number;
  date: string;
}

interface ShareCardCanvasProps {
  workouts: any[];
  prs: PRInfo[];
  weeklyVolumes: number[]; // last 8 weeks (kg)
  totalWorkouts: number;
  totalVolumeKg: number;
  unit: string;
  onClose: () => void;
}

type CardFormat = 'story' | 'square';

const ShareCardCanvas: React.FC<ShareCardCanvasProps> = ({
  prs, weeklyVolumes, totalWorkouts, totalVolumeKg, unit, onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<CardFormat>('story');

  const storyW = 1080, storyH = 1920;
  const squareW = 1080, squareH = 1080;
  const w = format === 'story' ? storyW : squareW;
  const h = format === 'story' ? storyH : squareH;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Subtle gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(59,130,246,0.06)');
    grad.addColorStop(1, 'rgba(99,102,241,0.04)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const px = 60;
    let y = format === 'story' ? 120 : 80;

    // Branding
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText('StrengthInsight', px, y);
    y += 50;

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.fillText('My Progress', px, y);
    y += 70;

    // Stats boxes
    const statsY = y;
    const boxW = (w - px * 3) / 2;
    const boxH = 100;

    // Workouts box
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(px, statsY, boxW, boxH, 16);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillText('Total Workouts', px + 20, statsY + 35);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillText(String(totalWorkouts), px + 20, statsY + 78);

    // Volume box
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(px * 2 + boxW, statsY, boxW, boxH, 16);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillText('Total Volume', px * 2 + boxW + 20, statsY + 35);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px Inter, sans-serif';
    const volStr = `${Math.round(fromKg(totalVolumeKg, unit as any) / 1000)}k ${unit}`;
    ctx.fillText(volStr, px * 2 + boxW + 20, statsY + 78);

    y = statsY + boxH + 60;

    // Top PRs
    if (prs.length > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText('TOP PERSONAL RECORDS', px, y);
      y += 40;

      for (const pr of prs) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(px, y, w - px * 2, 70, 12);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 20px Inter, sans-serif';
        const name = pr.exercise.length > 25 ? pr.exercise.slice(0, 25) + '...' : pr.exercise;
        ctx.fillText(name, px + 20, y + 30);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 22px Inter, sans-serif';
        const prText = `${Math.round(fromKg(pr.maxWeightKg, unit as any))} ${unit}`;
        ctx.fillText(prText, px + 20, y + 56);

        const dateStr = pr.date
          ? new Date(pr.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : '';
        ctx.fillStyle = '#64748b';
        ctx.font = '500 16px Inter, sans-serif';
        const dateW = ctx.measureText(dateStr).width;
        ctx.fillText(dateStr, w - px - 20 - dateW, y + 44);

        y += 80;
      }
      y += 20;
    }

    // Weekly volume bar chart
    if (weeklyVolumes.some((v) => v > 0)) {
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText('WEEKLY VOLUME (LAST 8 WEEKS)', px, y);
      y += 30;

      const chartW = w - px * 2;
      const chartH = format === 'story' ? 200 : 140;
      const barW = chartW / weeklyVolumes.length - 8;
      const maxVol = Math.max(...weeklyVolumes, 1);

      for (let i = 0; i < weeklyVolumes.length; i++) {
        const bh = (weeklyVolumes[i] / maxVol) * (chartH - 20);
        const bx = px + i * (chartW / weeklyVolumes.length) + 4;
        const by = y + chartH - bh;

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.roundRect(bx, by, barW, bh, 4);
        ctx.fill();
      }
      y += chartH + 20;
    }

    // Watermark
    ctx.fillStyle = '#334155';
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillText('strengthinsight.app', px, h - 50);
  }, [w, h, prs, weeklyVolumes, totalWorkouts, totalVolumeKg, unit, format]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `strengthinsight-progress-${format}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Share Progress Card</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Format toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit mb-4">
          <button
            onClick={() => setFormat('story')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${format === 'story' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
          >
            Story (9:16)
          </button>
          <button
            onClick={() => setFormat('square')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${format === 'square' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
          >
            Square (1:1)
          </button>
        </div>

        {/* Preview */}
        <div className="bg-slate-950 rounded-xl p-2 mb-4 flex justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            className="rounded-lg"
            style={{
              width: format === 'story' ? '200px' : '280px',
              height: format === 'story' ? '355px' : '280px',
            }}
          />
        </div>

        <button
          onClick={handleDownload}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors"
        >
          Download PNG
        </button>
      </div>
    </div>
  );
};

export default ShareCardCanvas;
