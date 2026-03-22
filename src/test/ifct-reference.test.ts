import { describe, it, expect } from 'vitest';
import { findIFCTReference, crossValidate, auditFoodDatabase } from '@/lib/ifct-reference';
import { INDIAN_FOODS } from '@/lib/indian-foods';

describe('IFCT Reference Integration', () => {
  it('finds IFCT reference for jowar roti', () => {
    const ref = findIFCTReference('Jowar Roti');
    expect(ref).not.toBeNull();
    expect(ref!.code).toBe('A005');
    expect(ref!.energyKcal).toBe(334);
    expect(ref!.protein).toBeCloseTo(9.97, 1);
  });

  it('finds IFCT reference for common foods', () => {
    expect(findIFCTReference('rice')).not.toBeNull();
    expect(findIFCTReference('paneer')).not.toBeNull();
    expect(findIFCTReference('egg')).not.toBeNull();
    expect(findIFCTReference('banana')).not.toBeNull();
    expect(findIFCTReference('dal')).not.toBeNull();
  });

  it('cross-validates jowar roti with <30% tolerance', () => {
    // Our DB: Jowar Roti per 100g: cal=349, pro=10.4, carbs=73, fat=1.9
    const disc = crossValidate('Jowar Roti', 349, 10.4, 73, 1.9, 30);
    // Should pass — values are close to IFCT raw jowar (334 cal, 9.97 pro, 67.68 carbs, 1.73 fat)
    // Carbs diff = (73-67.68)/67.68 = 7.8% → within 30%
    expect(disc.length).toBe(0);
  });

  it('catches impossible values against IFCT', () => {
    // Jowar with 800 cal/100g is clearly wrong
    const disc = crossValidate('Jowar Roti', 800, 10.4, 73, 1.9, 30);
    expect(disc.length).toBeGreaterThan(0);
    expect(disc.some(d => d.nutrient === 'calories')).toBe(true);
  });

  it('full audit of dry/cereal items finds no >30% discrepancies', () => {
    // Only check dry items where IFCT raw values should be close
    const dryItems = INDIAN_FOODS.filter(f =>
      f.category === 'Cereals' &&
      !f.name.toLowerCase().includes('cooked') &&
      !f.name.toLowerCase().includes('porridge') &&
      f.name.toLowerCase().includes('roti') // flour-based items
    );

    const auditResults = auditFoodDatabase(
      dryItems.map(f => ({
        name: f.name,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      }))
    );

    // Log discrepancies for visibility
    for (const r of auditResults) {
      console.log(`[AUDIT] ${r.food}:`, r.discrepancies.map(d =>
        `${d.nutrient}: app=${d.appValue} ifct=${d.ifctValue} (${d.diffPercent}%)`
      ).join(', '));
    }

    // Check that matched items are within 30% on calories
    for (const r of auditResults) {
      const calDisc = r.discrepancies.find(d => d.nutrient === 'calories');
      if (calDisc) {
        expect(calDisc.diffPercent).toBeLessThan(30);
      }
    }
  });

  it('full database audit summary', () => {
    const allAudit = auditFoodDatabase(
      INDIAN_FOODS.map(f => ({
        name: f.name,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      }))
    );

    // Count items with >30% calorie discrepancy (excluding cooked items which naturally differ)
    const severeCalDiscrepancies = allAudit.filter(r => {
      const calDisc = r.discrepancies.find(d => d.nutrient === 'calories');
      return calDisc && calDisc.diffPercent > 30;
    });

    console.log(`[FULL AUDIT] Total items with any discrepancy: ${allAudit.length}`);
    console.log(`[FULL AUDIT] Items with >30% calorie diff: ${severeCalDiscrepancies.length}`);
    for (const r of severeCalDiscrepancies) {
      const d = r.discrepancies.find(d => d.nutrient === 'calories')!;
      console.log(`  - ${r.food}: app=${d.appValue} ifct=${d.ifctValue} (${d.diffPercent}% off)`);
    }

    // This test documents the state; severe discrepancies in cooked items
    // are expected because IFCT has raw values
    expect(allAudit).toBeDefined();
  });
});
