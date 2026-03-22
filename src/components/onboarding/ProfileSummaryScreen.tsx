import { motion } from 'framer-motion';
import { Pencil, User, Ruler, Target, ShieldCheck, Apple, Wallet, ArrowRight } from 'lucide-react';
import { getBMICategory } from '@/lib/nutrition';
import MonikaGuide from './MonikaGuide';

interface ProfileSummaryProps {
  form: Record<string, any>;
  onEdit: (section: string) => void;
  onContinue: () => void;
}

const stagger = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 500, damping: 35 },
  }),
};

function SummarySection({ title, icon: Icon, items, onEdit, idx }: {
  title: string;
  icon: any;
  items: { label: string; value: string }[];
  onEdit: () => void;
  idx: number;
}) {
  return (
    <motion.div
      custom={idx}
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="bg-card border border-border rounded-2xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        </div>
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
        >
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-1.5 pl-[42px]">
        {items.map(item => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary', light: 'Lightly Active', moderate: 'Moderately Active',
  active: 'Very Active', athlete: 'Athlete',
};

const GOAL_LABELS: Record<string, string> = {
  lose: 'Lose Weight', gain: 'Gain Weight', maintain: 'Maintain',
};

export default function ProfileSummaryScreen({ form, onEdit, onContinue }: ProfileSummaryProps) {
  const bmi = form.weightKg && form.heightCm
    ? (form.weightKg / ((form.heightCm / 100) ** 2)).toFixed(1)
    : '—';

  const sections = [
    {
      title: 'Personal',
      icon: User,
      items: [
        { label: 'Name', value: form.name || '—' },
        { label: 'Age', value: form.age ? `${form.age} years` : '—' },
        { label: 'Gender', value: (form.gender || '—').charAt(0).toUpperCase() + (form.gender || '').slice(1) },
      ],
      editSection: 'name',
    },
    {
      title: 'Body Metrics',
      icon: Ruler,
      items: [
        { label: 'Height', value: `${form.heightCm || '—'} cm` },
        { label: 'Weight', value: `${form.weightKg || '—'} kg` },
        { label: 'Target Weight', value: `${form.targetWeight || '—'} kg` },
        { label: 'BMI', value: `${bmi} — ${getBMICategory(Number(bmi))}` },
      ],
      editSection: 'measurements',
    },
    {
      title: 'Goals & Activity',
      icon: Target,
      items: [
        { label: 'Goal', value: GOAL_LABELS[form.goal] || form.goal || '—' },
        { label: 'Activity Level', value: ACTIVITY_LABELS[form.activityLevel] || form.activityLevel || '—' },
        { label: 'Goal Speed', value: form.goalSpeed ? `${form.goalSpeed} kg/week` : '—' },
      ],
      editSection: 'goal',
    },
    {
      title: 'Health Conditions',
      icon: ShieldCheck,
      items: [
        {
          label: 'Conditions',
          value: (form.healthConditions || []).length > 0
            ? (form.healthConditions as string[]).map((c: string) => c.replace(/_/g, ' ')).join(', ')
            : 'None',
        },
        ...(form.gender === 'female' && (form.womenHealth || []).length > 0
          ? [{ label: "Women's Health", value: (form.womenHealth as string[]).join(', ').toUpperCase() }]
          : []),
        ...(form.medications ? [{ label: 'Medications', value: form.medications }] : []),
      ],
      editSection: 'health',
    },
    {
      title: 'Dietary Preferences',
      icon: Apple,
      items: [
        {
          label: 'Preferences',
          value: (form.dietaryPrefs || []).length > 0
            ? (form.dietaryPrefs as string[]).map((p: string) => p.replace(/_/g, ' ')).join(', ')
            : 'Not set',
        },
        { label: 'Cooking', value: form.cookingHabits || '—' },
        { label: 'Eating Out', value: form.eatingOut || '—' },
      ],
      editSection: 'dietary',
    },
    {
      title: 'Budget',
      icon: Wallet,
      items: [
        {
          label: 'Monthly Budget',
          value: form.budget?.monthly ? `₹${form.budget.monthly}` : 'Not set',
        },
      ],
      editSection: 'budget',
    },
  ];

  return (
    <div className="flex flex-col min-h-[80vh]">
      <div className="flex-1 space-y-3.5 pb-4">
        <MonikaGuide
          message={`${form.name || 'Friend'}, let's review everything before we create your plan. Tap ✏️ to edit.`}
          mood="thinking"
        />

        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-display font-bold text-foreground tracking-tight">Review Your Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">Make sure everything looks right.</p>
        </motion.div>

        {sections.map((section, i) => (
          <SummarySection
            key={section.title}
            title={section.title}
            icon={section.icon}
            items={section.items}
            onEdit={() => onEdit(section.editSection)}
            idx={i}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="sticky bottom-0 pt-3 pb-2 bg-background"
      >
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-full bg-primary text-primary-foreground text-base font-semibold flex items-center justify-center gap-2"
        >
          Looks Good — Continue <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
