import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HelpCircle, Mail, ChevronDown, Shield, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FAQ_DATA = [
  { q: 'How does NutriLens AI estimate calories?', a: 'NutriLens uses AI image recognition to identify food items, then matches them against a comprehensive Indian food database with verified nutritional data. You can always correct any estimates.' },
  { q: 'Is my data stored securely?', a: 'All your data is stored locally on your device. Nothing is sent to external servers without your explicit consent. Photos are processed in real-time and not stored on any cloud.' },
  { q: 'How accurate is the calorie count?', a: 'AI estimates are typically within 10-15% accuracy for common Indian foods. You can improve accuracy by correcting portion sizes and the AI learns from your corrections over time.' },
  { q: 'Can I use NutriLens without a camera?', a: 'Yes! You can manually search and add foods, use voice input, or scan barcodes. The camera is just one of many ways to log meals.' },
  { q: 'How is my daily calorie target calculated?', a: 'Your target is based on your BMR (Basal Metabolic Rate) calculated from your age, gender, height, and weight, multiplied by your activity level (TDEE), then adjusted for your goal (lose/gain/maintain).' },
  { q: 'What health conditions does the app support?', a: 'NutriLens provides specialized guidance for PCOS, diabetes, hypertension, thyroid conditions, and lactose intolerance. The AI coach adapts its recommendations based on your conditions.' },
  { q: 'How do I reset my data?', a: 'Go to Profile → AI Learning to clear correction data. For a full reset, clear your browser\'s local storage for this site. Note: this cannot be undone.' },
  { q: 'Can I export my food diary?', a: 'Yes! Go to Profile → Export Data to download your meals, weight, symptoms, and expenses as a CSV file compatible with Excel and Google Sheets.' },
];

export default function HelpSupportSheet({ open, onClose }: Props) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" /> Help & Support
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4 overflow-y-auto max-h-[70vh] pb-8">
          {/* FAQ */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Frequently Asked Questions</p>
            {FAQ_DATA.map((faq, i) => (
              <div key={i} className="card-subtle overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="card-elevated p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Us</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Email Support</p>
                <p className="text-xs text-muted-foreground">support@nutrilens.ai</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Response time: within 24 hours on business days</p>
          </div>

          {/* Legal */}
          <div className="card-elevated overflow-hidden">
            <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border hover:bg-muted/50 transition-colors">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">Terms & Conditions</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border hover:bg-muted/50 transition-colors">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">Privacy Policy</span>
            </button>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Info className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-foreground">App Version</span>
                <p className="text-[10px] text-muted-foreground">NutriLens AI v1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
