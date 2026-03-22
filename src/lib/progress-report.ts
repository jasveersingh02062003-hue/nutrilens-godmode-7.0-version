import { getRecentLogs, getDailyTotals, getProfile } from './store';
import { getWeightEntries } from './weight-history';
import { getUnlockedBadges, BADGES } from './achievements';

export interface ReportData {
  period: 'weekly' | 'monthly';
  dateRange: string;
  name: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalMeals: number;
  streak: number;
  waterGoalHits: number;
  daysTracked: number;
  weightStart: number | null;
  weightEnd: number | null;
  weightChange: number | null;
  weightUnit: string;
  calorieGoal: number;
  badgesEarned: number;
  totalBadges: number;
  dailyCalories: number[];
}

export function generateReportData(period: 'weekly' | 'monthly'): ReportData {
  const profile = getProfile();
  const days = period === 'weekly' ? 7 : 30;
  const logs = getRecentLogs(days);
  const weightEntries = getWeightEntries();
  const unlocked = getUnlockedBadges();
  const waterGoal = profile?.waterGoal || 8;
  const calorieGoal = profile?.dailyCalories || 2000;

  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0, totalMeals = 0, waterHits = 0, daysTracked = 0;
  const dailyCalories: number[] = [];

  for (const log of logs) {
    const t = getDailyTotals(log);
    dailyCalories.push(t.eaten);
    if (t.eaten > 0) {
      daysTracked++;
      totalCal += t.eaten;
      totalP += t.protein;
      totalC += t.carbs;
      totalF += t.fat;
      totalMeals += log.meals.length;
    }
    if (log.waterCups >= waterGoal) waterHits++;
  }

  let streak = 0;
  for (const log of logs) {
    if (getDailyTotals(log).eaten > 0) streak++;
    else break;
  }

  const recentWeights = weightEntries.filter(w => {
    const d = new Date(w.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return d >= cutoff;
  });

  const weightStart = recentWeights.length > 0 ? recentWeights[0].weight : null;
  const weightEnd = recentWeights.length > 0 ? recentWeights[recentWeights.length - 1].weight : null;

  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - days + 1);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    period,
    dateRange: `${fmt(startDate)} – ${fmt(today)}`,
    name: profile?.name || 'User',
    avgCalories: daysTracked > 0 ? Math.round(totalCal / daysTracked) : 0,
    avgProtein: daysTracked > 0 ? Math.round(totalP / daysTracked) : 0,
    avgCarbs: daysTracked > 0 ? Math.round(totalC / daysTracked) : 0,
    avgFat: daysTracked > 0 ? Math.round(totalF / daysTracked) : 0,
    totalMeals,
    streak,
    waterGoalHits: waterHits,
    daysTracked,
    weightStart,
    weightEnd,
    weightChange: weightStart && weightEnd ? +(weightEnd - weightStart).toFixed(1) : null,
    weightUnit: recentWeights[0]?.unit || 'kg',
    calorieGoal,
    badgesEarned: unlocked.length,
    totalBadges: BADGES.length,
    dailyCalories: dailyCalories.reverse(),
  };
}

export function renderReportToCanvas(data: ReportData): HTMLCanvasElement {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a1f14');
  bg.addColorStop(0.5, '#0d2818');
  bg.addColorStop(1, '#0a1a10');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle pattern overlay
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }

  const px = 60;
  let y = 80;

  // Header
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '600 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('NUTRILENS AI', px, y);
  y += 50;

  // Period badge
  const periodLabel = data.period === 'weekly' ? 'WEEKLY REPORT' : 'MONTHLY REPORT';
  ctx.fillStyle = '#2dd4a0';
  ctx.font = '800 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(periodLabel, px, y);
  y += 36;

  // Date range
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '500 26px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(data.dateRange, px, y);
  y += 60;

  // Name greeting
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 52px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${data.name}'s Progress`, px, y);
  y += 90;

  // Divider
  const divGrad = ctx.createLinearGradient(px, 0, W - px, 0);
  divGrad.addColorStop(0, 'rgba(45,212,160,0.6)');
  divGrad.addColorStop(1, 'rgba(45,212,160,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(px, y, W - px * 2, 2);
  y += 40;

  // Calorie summary card
  drawCard(ctx, px, y, W - px * 2, 200, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('AVG DAILY CALORIES', px + 32, y + 30);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 72px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${data.avgCalories}`, px + 32, y + 68);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '500 32px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`/ ${data.calorieGoal} kcal goal`, px + 32 + ctx.measureText(`${data.avgCalories}`).width + 12, y + 100);
  y += 230;

  // Macro cards row
  const cardW = (W - px * 2 - 24) / 3;
  const macros = [
    { label: 'Protein', value: `${data.avgProtein}g`, color: '#f97066' },
    { label: 'Carbs', value: `${data.avgCarbs}g`, color: '#2dd4a0' },
    { label: 'Fat', value: `${data.avgFat}g`, color: '#f0b938' },
  ];
  macros.forEach((m, i) => {
    const x = px + i * (cardW + 12);
    drawCard(ctx, x, y, cardW, 140, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = m.color;
    ctx.font = '800 40px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(m.value, x + 24, y + 36);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '600 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(m.label, x + 24, y + 92);
  });
  y += 172;

  // Mini chart
  drawCard(ctx, px, y, W - px * 2, 260, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('DAILY CALORIES', px + 32, y + 28);

  const chartX = px + 32;
  const chartY = y + 70;
  const chartW = W - px * 2 - 64;
  const chartH = 140;
  const maxCal = Math.max(...data.dailyCalories, data.calorieGoal, 1);
  const barCount = Math.min(data.dailyCalories.length, data.period === 'weekly' ? 7 : 30);
  const barGap = data.period === 'weekly' ? 12 : 2;
  const barW = (chartW - (barCount - 1) * barGap) / barCount;

  for (let i = 0; i < barCount; i++) {
    const cal = data.dailyCalories[data.dailyCalories.length - barCount + i] || 0;
    const h = Math.max(4, (cal / maxCal) * chartH);
    const bx = chartX + i * (barW + barGap);
    const by = chartY + chartH - h;
    const isOnTrack = cal > 0 && Math.abs(cal - data.calorieGoal) / data.calorieGoal <= 0.1;
    ctx.fillStyle = isOnTrack ? '#2dd4a0' : 'rgba(45,212,160,0.25)';
    roundRectFill(ctx, bx, by, barW, h, 4);
  }

  // Goal line
  const goalY = chartY + chartH - (data.calorieGoal / maxCal) * chartH;
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(chartX, goalY);
  ctx.lineTo(chartX + chartW, goalY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '500 16px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${data.calorieGoal} goal`, chartX + chartW, goalY - 6);
  ctx.textAlign = 'left';
  y += 290;

  // Stats grid (2x2)
  const halfW = (W - px * 2 - 16) / 2;
  const statsGrid = [
    { label: 'Days Tracked', value: `${data.daysTracked}`, emoji: '📅' },
    { label: 'Current Streak', value: `${data.streak} days`, emoji: '🔥' },
    { label: 'Meals Logged', value: `${data.totalMeals}`, emoji: '🍽️' },
    { label: 'Water Goals Met', value: `${data.waterGoalHits}`, emoji: '💧' },
  ];
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = px + col * (halfW + 16);
    const sy = y + row * 136;
    drawCard(ctx, sx, sy, halfW, 120, 'rgba(255,255,255,0.04)');
    ctx.font = '36px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(statsGrid[i].emoji, sx + 24, sy + 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 36px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(statsGrid[i].value, sx + 24, sy + 70);  // Using fillText for value only
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(statsGrid[i].label, sx + 24, sy + 94); // Using fillText for label
  }
  y += 292;

  // Weight change
  if (data.weightChange != null) {
    drawCard(ctx, px, y, W - px * 2, 120, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('WEIGHT CHANGE', px + 32, y + 28);
    const changeColor = data.weightChange <= 0 ? '#2dd4a0' : '#f97066';
    ctx.fillStyle = changeColor;
    ctx.font = '800 48px "Plus Jakarta Sans", system-ui, sans-serif';
    const sign = data.weightChange > 0 ? '+' : '';
    ctx.fillText(`${sign}${data.weightChange} ${data.weightUnit}`, px + 32, y + 56);
    y += 148;
  }

  // Badges
  drawCard(ctx, px, y, W - px * 2, 100, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('BADGES EARNED', px + 32, y + 28);
  ctx.fillStyle = '#f0b938';
  ctx.font = '800 40px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${data.badgesEarned} / ${data.totalBadges}`, px + 32, y + 54);
  y += 130;

  // Footer
  ctx.fillStyle = divGrad;
  ctx.fillRect(px, H - 100, W - px * 2, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '500 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Generated by NutriLens AI • ' + new Date().toLocaleDateString(), W / 2, H - 60);
  ctx.textAlign = 'left';

  return canvas;
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = fill;
  roundRectFill(ctx, x, y, w, h, 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 20);
  ctx.stroke();
}

function roundRectFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function downloadReport(canvas: HTMLCanvasElement, period: string) {
  const link = document.createElement('a');
  link.download = `nutrilens-${period}-report-${new Date().toISOString().split('T')[0]}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function shareReport(canvas: HTMLCanvasElement, period: string): Promise<boolean> {
  try {
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob(b => resolve(b!), 'image/png')
    );
    const file = new File([blob], `nutrilens-${period}-report.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `My ${period} NutriLens Report`,
        text: `Check out my ${period} nutrition progress!`,
        files: [file],
      });
      return true;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return false;
  }
  return false;
}
