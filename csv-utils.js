// Pure helpers for the vehicle-catalog CSV import (no DOM / network, so they can be unit-tested).
export const TEMPLATE = 'brand,model,generation,generation_code,start_year,end_year,variant,market\n';
export const norm = s => (s || '').trim().toLowerCase();
export const key = (...a) => a.map(norm).join('|');

export function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false; text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

/** existing = {brands,models,gens,variants} Sets of normalised keys. Returns validated rows + what would be created. */
export function buildPlan(rows, existing) {
  const [head, ...body] = rows; if (!head) return { fatal: 'الملف فارغ.' };
  const col = {}; head.forEach((c, i) => { col[norm(c)] = i; });
  const missing = ['brand', 'model'].filter(c => !(c in col));
  if (missing.length) return { fatal: 'أعمدة ناقصة: ' + missing.join(', ') };
  const g = (r, c) => (c in col ? (r[col[c]] || '').trim() : '');
  const plan = { brands: new Map(), models: new Map(), gens: new Map(), variants: new Map() }, seen = new Set(), out = [], errors = [];
  body.forEach((r, i) => {
    const row = { line: i + 2, brand: g(r, 'brand'), model: g(r, 'model'), generation: g(r, 'generation'), code: g(r, 'generation_code'),
      sy: g(r, 'start_year'), ey: g(r, 'end_year'), variant: g(r, 'variant'), market: g(r, 'market') };
    const errs = [];
    if (!row.brand) errs.push('الماركة مطلوبة'); if (!row.model) errs.push('الموديل مطلوب');
    if (row.variant && !row.generation) errs.push('الفئة تتطلب جيلًا');
    for (const [k, l] of [['sy', 'سنة البداية'], ['ey', 'سنة النهاية']]) if (row[k] && !/^\d{4}$/.test(row[k])) errs.push(l + ' غير صالحة');
    if (!errs.length && row.sy && row.ey && +row.ey < +row.sy) errs.push('سنة النهاية قبل البداية');
    if (errs.length) { row.status = 'error'; row.errs = errs; errors.push(`سطر ${row.line}: ${errs.join('، ')}`); out.push(row); return; }
    const full = key(row.brand, row.model, row.generation, row.variant, row.market);
    if (seen.has(full)) { row.status = 'dup'; out.push(row); return; }
    seen.add(full);
    const kb = key(row.brand), km = key(row.brand, row.model), kg = key(row.brand, row.model, row.generation), kv = full;
    let isNew = false;
    if (!existing.brands.has(kb) && !plan.brands.has(kb)) { plan.brands.set(kb, { name: row.brand }); isNew = true; }
    if (!existing.models.has(km) && !plan.models.has(km)) { plan.models.set(km, { brand: row.brand, name: row.model }); isNew = true; }
    if (row.generation) {
      if (!existing.gens.has(kg) && !plan.gens.has(kg)) {
        plan.gens.set(kg, { brand: row.brand, model: row.model, name: row.generation, code: row.code || null,
          start_year: row.sy ? +row.sy : null, end_year: row.ey ? +row.ey : null }); isNew = true; }
      if (row.variant && !existing.variants.has(kv) && !plan.variants.has(kv)) {
        plan.variants.set(kv, { brand: row.brand, model: row.model, generation: row.generation, name: row.variant, market: row.market || null }); isNew = true; }
    }
    row.status = isNew ? 'new' : 'exists'; out.push(row);
  });
  return { rows: out, plan, errors };
}
