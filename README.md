# Mobadra — منصة إنجاز الفعاليات

تطبيق ويب عربي RTL لإنشاء ونشر **ورقة إنجاز للفعاليات المدرسية** مع QR Code مستقل لكل فعالية.

## المزايا

- خط Cairo وتصميم متجاوب للجوال والكمبيوتر.
- إدخال اسم الفعالية، المؤسسة، التاريخ، المكان، المجال، الفئة المستهدفة وعدد المشاركين.
- هدف الفعالية ونبذة تنفيذية.
- رفع شعار المؤسسة وحتى 6 صور شواهد مع ضغط الصور داخل المتصفح.
- بيانات التذييل: التصميم، المتابعة، المدير/المنسق، المساعدون، مدير المدرسة.
- معاينة مباشرة لورقة الإنجاز.
- طباعة وحفظ PDF بمقاس A4.
- رابط عام وQR Code لكل فعالية.
- GitHub Pages للواجهة.
- Neon Postgres لحفظ البيانات.
- Neon Data API للقراءة والنشر.
- RLS وصلاحيات PostgreSQL للعرض العام الآمن.
- RPC محمية بمفتاح إدارة للحفظ والتعديل.

## البنية الحالية

- Frontend: GitHub Pages.
- Database: Neon Postgres.
- Auth service: Neon Auth.
- API: Neon Data API / PostgREST.
- Public access: دور `anonymous` يقرأ الفعاليات المنشورة فقط.
- Admin writes: الدالة `mobadra_save_event` تتحقق من مفتاح الإدارة قبل الحفظ.

## هيكل المشروع

- `index.html` — واجهة التطبيق.
- `styles.css` — التصميم والطباعة.
- `app.js` — المنطق، المعاينة، الصور، Data API وQR.
- `config.js` — رابط Neon Data API.
- `neon/schema.sql` — مخطط قاعدة البيانات الأساسي.
- `neon/data-api-security.sql` — RLS والصلاحيات وRPC.
- `neon.ts` — تعريف Neon Auth وData API.
- `.github/workflows/pages.yml` — نشر GitHub Pages.

## Neon

المشروع المستخدم:

- Project ID: `calm-base-78688820`
- Branch: `production`
- Database: `neondb`
- Region: `aws-us-east-2`

الإعداد المعلن في `neon.ts`:

```ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  dataApi: true,
});
```

بعد ربط المشروع محليًا يمكن تطبيق الإعداد باستخدام:

```bash
neon deploy
```

> لا يتم تخزين مفتاح الإدارة بصورته النصية ولا Connection String داخل GitHub.
