# ربط QGIS بقاعدة البيانات (عرض حيّ للإدخالات والبلاغات)

## بيانات الاتصال (حساب قراءة فقط)
- **Host:** `aws-0-ap-northeast-1.pooler.supabase.com`  (بديل مباشر: `db.njcjkyuozhoilbkrghoa.supabase.co`)
- **Port:** `5432`
- **Database:** `postgres`
- **User:** `qgis_reader.njcjkyuozhoilbkrghoa`  (عند استخدام الـ pooler) — أو `qgis_reader` عند الاتصال المباشر
- **Password:** يُطلب من مدير النظام (تم إنشاؤه في 2026-08-15)
- **SSL mode:** `require`

## الخطوات في QGIS
1. Layer → Data Source Manager → PostgreSQL → **New**.
2. أدخل البيانات أعلاه، فعّل "Also list tables with no geometry" غير ضروري. اضغط **Test Connection**.
3. اضغط **Connect** ثم اختر:
   - `public.submissions_map` — إدخالات النماذج (عمود `geom`)
4. **Add**. الطبقات حيّة: أي إدخال جديد يظهر عند التحديث (F5) أو بتفعيل Auto-refresh من خصائص الطبقة → Rendering.

## تلوين مقترح
- submissions_map: Categorized على `form_title` أو `status`.

## ملاحظة أمنية
حساب `qgis_reader` للقراءة فقط ولا يستطيع التعديل. لا تشاركه خارج الدائرة.
