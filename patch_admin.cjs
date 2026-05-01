const fs = require('fs');

const file = 'src/pages/Admin.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Replace lines 703-722 (0-indexed: 703 to 722 inclusive)
// These are the cover image URL section (lines 704-723 in 1-indexed)
const newLines = [
  '          <div className="space-y-1.5">\r',
  '            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Cover Image (URL or Upload)</label>\r',
  '            <div className="flex gap-3 items-center">\r',
  '              <input\r',
  '                type="text"\r',
  "                value={formData.coverImage?.startsWith('data:') ? '(uploaded image)' : formData.coverImage || ''}\r",
  '                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}\r',
  '                placeholder="https://... or click Upload"\r',
  '                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"\r',
  '              />\r',
  '              <label className="shrink-0 px-4 py-3 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200 flex items-center gap-2">\r',
  '                <ImageIcon className="w-4 h-4" />\r',
  '                Upload\r',
  '                <input\r',
  '                  type="file"\r',
  '                  accept="image/*"\r',
  '                  className="hidden"\r',
  '                  onChange={(e) => {\r',
  '                    const file = e.target.files?.[0];\r',
  '                    if (!file) return;\r',
  '                    const reader = new FileReader();\r',
  '                    reader.onload = (evt) => {\r',
  '                      setFormData((prev) => ({ ...prev, coverImage: evt.target?.result as string }));\r',
  '                    };\r',
  '                    reader.readAsDataURL(file);\r',
  '                  }}\r',
  '                />\r',
  '              </label>\r',
  '              <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">\r',
  '                {formData.coverImage ? (\r',
  '                  <img src={formData.coverImage} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />\r',
  '                ) : (\r',
  '                  <ImageIcon className="w-5 h-5 text-slate-300" />\r',
  '                )}\r',
  '              </div>\r',
  '            </div>\r',
  "            {formData.coverImage?.startsWith('data:') && (\r",
  '              <p className="text-[10px] text-emerald-600 font-bold ml-1">✓ Image uploaded successfully</p>\r',
  '            )}\r',
  '          </div>',
];

// Replace lines 703 to 722 (0-indexed) with new lines
lines.splice(703, 20, ...newLines);

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Done! File updated successfully.');
