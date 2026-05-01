const fs = require('fs');

// 1. Update src/types.ts
let types = fs.readFileSync('src/types.ts', 'utf8');
if (!types.includes('shippingKtm')) {
  types = types.replace(
    'updatedAt: number;',
    'updatedAt: number;\n  shippingKtm: number;\n  shippingOutside: number;\n  freeShippingThreshold: number;'
  );
  fs.writeFileSync('src/types.ts', types);
}

// 2. Update server/schema.ts
let schema = fs.readFileSync('server/schema.ts', 'utf8');
if (!schema.includes('shipping_ktm')) {
  schema = schema.replace(
    'hero_image TEXT NOT NULL DEFAULT \'\',',
    'hero_image TEXT NOT NULL DEFAULT \'\',\n    shipping_ktm NUMERIC(10,2) NOT NULL DEFAULT 100,\n    shipping_outside NUMERIC(10,2) NOT NULL DEFAULT 150,\n    free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 5000,'
  );
  fs.writeFileSync('server/schema.ts', schema);
}

// 3. Update server/routes/admin.ts
let adminRoute = fs.readFileSync('server/routes/admin.ts', 'utf8');
if (!adminRoute.includes('shippingKtm')) {
  adminRoute = adminRoute.replace(
    'heroImage: r.hero_image,',
    'heroImage: r.hero_image,\n        shippingKtm: Number(r.shipping_ktm || 100),\n        shippingOutside: Number(r.shipping_outside || 150),\n        freeShippingThreshold: Number(r.free_shipping_threshold || 5000),'
  );
  adminRoute = adminRoute.replace(
    'const { siteName, tagline, primaryColor, accentColor, heroImage } = req.body || {};',
    'const { siteName, tagline, primaryColor, accentColor, heroImage, shippingKtm, shippingOutside, freeShippingThreshold } = req.body || {};'
  );
  adminRoute = adminRoute.replace(
    'hero_image = Rs.5, updated_at = NOW()',
    'hero_image = Rs.5, shipping_ktm = Rs.6, shipping_outside = Rs.7, free_shipping_threshold = Rs.8, updated_at = NOW()'
  );
  adminRoute = adminRoute.replace(
    '[siteName, tagline, primaryColor, accentColor, heroImage || \'\']',
    '[siteName, tagline, primaryColor, accentColor, heroImage || \'\', Number(shippingKtm || 100), Number(shippingOutside || 150), Number(freeShippingThreshold || 5000)]'
  );
  fs.writeFileSync('server/routes/admin.ts', adminRoute);
}

// 4. Update src/context/SiteSettingsContext.tsx
let context = fs.readFileSync('src/context/SiteSettingsContext.tsx', 'utf8');
if (!context.includes('shippingKtm')) {
  context = context.replace(
    'heroImage: \'\',',
    'heroImage: \'\',\n  shippingKtm: 100,\n  shippingOutside: 150,\n  freeShippingThreshold: 5000,'
  );
  fs.writeFileSync('src/context/SiteSettingsContext.tsx', context);
}

// 5. Update src/pages/Admin.tsx
let adminUI = fs.readFileSync('src/pages/Admin.tsx', 'utf8');
if (!adminUI.includes('Shipping Fees')) {
  const customColorsBlock = `<div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Custom Colors</p>
            <div className="grid md:grid-cols-2 gap-4">
              <ColorField label="Primary" value={form.primaryColor} onChange={(v) => update('primaryColor', v)} />
              <ColorField label="Accent" value={form.accentColor} onChange={(v) => update('accentColor', v)} />
            </div>
          </div>`;
          
  const shippingBlock = `<div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Shipping Fees & Policies (Rs.)</p>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Inside Kathmandu" type="number" min="0" value={String(form.shippingKtm)} onChange={(v) => update('shippingKtm', Number(v))} />
              <Field label="Outside Valley" type="number" min="0" value={String(form.shippingOutside)} onChange={(v) => update('shippingOutside', Number(v))} />
              <Field label="Free Shipping Over" type="number" min="0" value={String(form.freeShippingThreshold)} onChange={(v) => update('freeShippingThreshold', Number(v))} />
            </div>
          </div>`;
          
  adminUI = adminUI.replace(customColorsBlock, customColorsBlock + '\n\n          ' + shippingBlock);
  fs.writeFileSync('src/pages/Admin.tsx', adminUI);
}

// 6. Update src/pages/Cart.tsx
let cart = fs.readFileSync('src/pages/Cart.tsx', 'utf8');
if (!cart.includes('useSiteSettings')) {
  cart = cart.replace('import { useCart } from \'../context/CartContext\';', 'import { useCart } from \'../context/CartContext\';\nimport { useSiteSettings } from \'../context/SiteSettingsContext\';');
  cart = cart.replace('export default function Cart() {', 'export default function Cart() {\n  const { settings } = useSiteSettings();');
  cart = cart.replace('const isFreeShipping = total >= FREE_SHIPPING_THRESHOLD;', 'const isFreeShipping = total >= settings.freeShippingThreshold;');
  cart = cart.replace('const shipping = total > 0 ? (isFreeShipping ? 0 : SHIPPING_FEE) : 0;', 'const shipping = total > 0 ? (isFreeShipping ? 0 : settings.shippingKtm) : 0; // estimate based on KTM');
  cart = cart.replace('import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from \'../constants\';\n', '');
  fs.writeFileSync('src/pages/Cart.tsx', cart);
}

// 7. Update src/pages/Checkout.tsx
let checkout = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');
if (!checkout.includes('shippingLocation')) {
  checkout = checkout.replace('import { useCart } from \'../context/CartContext\';', 'import { useCart } from \'../context/CartContext\';\nimport { useSiteSettings } from \'../context/SiteSettingsContext\';');
  checkout = checkout.replace('import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from \'../constants\';\n', '');
  checkout = checkout.replace('export default function Checkout() {', 'export default function Checkout() {\n  const { settings } = useSiteSettings();\n  const [shippingLocation, setShippingLocation] = useState<\'ktm\' | \'outside\'>(\'ktm\');');
  
  checkout = checkout.replace('const isFreeShipping = total >= FREE_SHIPPING_THRESHOLD;', 'const isFreeShipping = total >= settings.freeShippingThreshold;');
  checkout = checkout.replace('const shipping = total > 0 ? (isFreeShipping ? 0 : SHIPPING_FEE) : 0;', 'const shipping = total > 0 ? (isFreeShipping ? 0 : (shippingLocation === \'ktm\' ? settings.shippingKtm : settings.shippingOutside)) : 0;');
  
  // Add dropdown for location selection
  const addrField = `<Field
                  label="Shipping Address"
                  required
                  value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })}
                  placeholder="Street address, City, Province"
                />`;
  const locationField = `<Field
                  label="Shipping Address"
                  required
                  value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })}
                  placeholder="Street address, City, Province"
                />
                
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Delivery Location</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShippingLocation('ktm')}
                      className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-all \${shippingLocation === 'ktm' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}\`}
                    >
                      Inside Kathmandu Valley
                    </button>
                    <button
                      type="button"
                      onClick={() => setShippingLocation('outside')}
                      className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-all \${shippingLocation === 'outside' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}\`}
                    >
                      Outside Valley
                    </button>
                  </div>
                </div>`;
                
  checkout = checkout.replace(addrField, locationField);
  fs.writeFileSync('src/pages/Checkout.tsx', checkout);
}

console.log('Successfully applied all changes');
