# Mobadra — منصة إنجاز الفعاليات

تطبيق ويب عربي RTL لإنشاء ونشر **ورقة إنجاز للفعاليات المدرسية** مع QR Code مستقل لكل فعالية.

## المزايا

- خط Cairo وتصميم متجاوب للجوال والكمبيوتر.
- اسم الفعالية، المؤسسة، التاريخ، المكان، المجال، الفئة المستهدفة وعدد المشاركين.
- هدف الفعالية ونبذة تنفيذية.
- رفع شعار المؤسسة وحتى 6 صور شواهد مع ضغط الصور داخل المتصفح.
- بيانات التذييل: التصميم، المتابعة، المدير/المنسق، المساعدون، مدير المدرسة.
- معاينة مباشرة لورقة الإنجاز.
- طباعة وحفظ PDF بمقاس A4.
- رابط عام وQR Code لكل فعالية.
- GitHub Pages للواجهة.
- Neon Postgres لحفظ البيانات.
- Neon Function كـ API آمن للحفظ والقراءة.

## هيكل المشروع

- `index.html` — واجهة التطبيق.
- `styles.css` — التصميم والطباعة.
- `app.js` — المنطق، المعاينة، الصور وQR.
- `config.js` — رابط API بعد نشر Neon Function.
- `neon/schema.sql` — مخطط قاعدة البيانات.
- `functions/mobadra.ts` — API.
- `neon.ts` — تعريف Neon Function.
- `.github/workflows/pages.yml` — نشر GitHub Pages.

## إعداد Neon

1. أنشئ/حدد مشروع Neon.
2. نفّذ ملف `neon/schema.sql`.
3. اضبط متغير البيئة `MOBADRA_ADMIN_KEY` داخل Neon Function.
4. انشر Function باسم `mobadra`.
5. ضع رابط Invocation URL في `config.js` داخل `apiBase`.
6. ضع `requiresAdminKey: true` في `config.js`.

> لا يتم وضع كلمة مرور الإدارة أو Connection String داخل GitHub.
