import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { getProfile, getDailyLog, toLocalDateKey } from '@/lib/store';
import { toast } from 'sonner';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GymPDFExport() {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const profile = getProfile();
      if (!profile?.gym?.goer) {
        toast.error('No gym data to export');
        return;
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

      // Gather data
      const workoutDays: number[] = [];
      const missedDayNames: string[] = [];
      let totalCals = 0;
      let totalWorkouts = 0;
      const energyOnGym: number[] = [];
      const energyOffGym: number[] = [];
      const allEnergy: { day: number; level: number }[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const log = getDailyLog(dateStr);
        if (log.gym?.attended) {
          workoutDays.push(d);
          totalWorkouts++;
          totalCals += log.gym.caloriesBurned || 0;
          if (log.energyLevel) energyOnGym.push(log.energyLevel);
        } else {
          const dt = new Date(dateStr + 'T00:00:00');
          missedDayNames.push(DAY_NAMES[dt.getDay()]);
          if (log.energyLevel) energyOffGym.push(log.energyLevel);
        }
        if (log.energyLevel) allEnergy.push({ day: d, level: log.energyLevel });
      }

      const stats = profile.gym.stats || { currentStreak: 0, bestStreak: 0, consistencyPercent: 0, totalWorkouts: 0, totalCaloriesBurned: 0 };
      const planned = profile.gym.daysPerWeek || 3;
      const consistencyPct = planned > 0 ? Math.round((totalWorkouts / (planned * 4)) * 100) : 0;

      // Most missed day
      const dayCounts: Record<string, number> = {};
      missedDayNames.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1; });
      const mostMissed = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

      // Energy comparison
      const avgGymEnergy = energyOnGym.length > 0 ? (energyOnGym.reduce((a, b) => a + b, 0) / energyOnGym.length) : 0;
      const avgOffEnergy = energyOffGym.length > 0 ? (energyOffGym.reduce((a, b) => a + b, 0) / energyOffGym.length) : 0;
      const energyDiffPct = avgOffEnergy > 0 ? Math.round(((avgGymEnergy - avgOffEnergy) / avgOffEnergy) * 100) : 0;

      // ─── PDF Layout ───
      let y = 15;
      const lm = 15;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Gym Progress Report', lm, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(monthName, lm, y);
      y += 10;

      // Stats row
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const statsItems = [
        { label: 'Workouts', value: String(totalWorkouts) },
        { label: 'Calories Burned', value: `${totalCals} kcal` },
        { label: 'Current Streak', value: `${stats.currentStreak} days` },
        { label: 'Best Streak', value: `${stats.bestStreak} days` },
        { label: 'Consistency', value: `${consistencyPct}%` },
      ];
      const colW = (pw - 30) / statsItems.length;
      statsItems.forEach((item, i) => {
        const x = lm + i * colW;
        doc.setFont('helvetica', 'bold');
        doc.text(item.value, x, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(item.label, x, y + 4);
        doc.setFontSize(9);
      });
      y += 14;

      // Monthly calendar
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Attendance Calendar', lm, y);
      y += 6;

      const cellSize = 7;
      const firstDayOfWeek = new Date(year, month, 1).getDay();
      // Day headers
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      DAY_NAMES.forEach((dn, i) => {
        doc.text(dn, lm + i * (cellSize + 1) + 1, y);
      });
      y += 4;

      let col = firstDayOfWeek;
      let row = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const x = lm + col * (cellSize + 1);
        const cy = y + row * (cellSize + 1);
        if (workoutDays.includes(d)) {
          doc.setFillColor(59, 130, 246);
          doc.roundedRect(x, cy, cellSize, cellSize, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
        } else {
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(x, cy, cellSize, cellSize, 1, 1, 'S');
          doc.setTextColor(100, 100, 100);
        }
        doc.setFontSize(6);
        doc.text(String(d), x + 1.5, cy + 4.5);
        doc.setTextColor(0, 0, 0);
        col++;
        if (col > 6) { col = 0; row++; }
      }
      y += (row + 1) * (cellSize + 1) + 6;

      // Energy trend bars
      if (allEnergy.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Energy Trend (Last 30 Days)', lm, y);
        y += 6;
        const barW = Math.min(4, (pw - 30) / Math.max(allEnergy.length, 1));
        const maxH = 15;
        allEnergy.forEach((e, i) => {
          const h = (e.level / 5) * maxH;
          const x = lm + i * (barW + 0.5);
          const isGym = workoutDays.includes(e.day);
          doc.setFillColor(isGym ? 59 : 200, isGym ? 130 : 200, isGym ? 246 : 200);
          doc.rect(x, y + maxH - h, barW, h, 'F');
        });
        y += maxH + 8;
      }

      // Insights
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Insights', lm, y);
      y += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      const insights: string[] = [];
      if (mostMissed) {
        insights.push(`You missed ${daysInMonth - totalWorkouts} workouts this month. Most missed on ${mostMissed[0]}s — consider moving your rest day.`);
      }
      if (energyDiffPct !== 0) {
        insights.push(`Your energy is ${Math.abs(energyDiffPct)}% ${energyDiffPct > 0 ? 'higher' : 'lower'} on workout days.`);
      }
      if (consistencyPct >= 80) {
        insights.push(`Great consistency at ${consistencyPct}%! Keep up the momentum.`);
      } else if (consistencyPct >= 50) {
        insights.push(`${consistencyPct}% consistency — aim for 80%+ by adding one more session per week.`);
      } else {
        insights.push(`${consistencyPct}% consistency is below target. Try scheduling gym at the same time every day.`);
      }

      insights.forEach(text => {
        const lines = doc.splitTextToSize(`• ${text}`, pw - 30);
        doc.text(lines, lm, y);
        y += lines.length * 4 + 2;
      });

      // Footer
      y += 5;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by NutriLens AI on ${today.toLocaleDateString()}`, lm, y);

      doc.save(`gym-report-${monthName.replace(' ', '-').toLowerCase()}.pdf`);
      toast.success('📄 Gym report downloaded!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
    >
      {generating ? (
        <span className="animate-spin w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      Download Gym Report
    </button>
  );
}
