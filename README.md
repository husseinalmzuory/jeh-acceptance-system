# منظومة قبولات النشر — JEH

منظومة داخلية لإصدار وأرشفة والتحقق من كتب قبول النشر في مجلة التربية للعلوم الإنسانية، جامعة الموصل.

## النطاق

- حساب دخول واحد للمجلة.
- إصدار وحفظ قبولات النشر فقط.
- لا تستبدل المنظومة منصة OJS ولا تتابع مراحل البحث.
- قاعدة البيانات والمصادقة والتخزين عبر Supabase.
- الواجهة مبنية باستخدام React وVite، وتنشر عبر GitHub Pages.

## إعداد البيئة

انسخ `.env.example` إلى `.env.local` وأضف عنوان مشروع Supabase والمفتاح القابل للنشر. لا تضع أي مفتاح سري أو `service_role` في الواجهة أو المستودع.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## قاعدة البيانات

ملفات SQL مرتبة داخل `supabase/migrations`. يجب تنفيذها بالتسلسل في SQL Editor داخل Supabase.
