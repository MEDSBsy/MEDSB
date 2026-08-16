# الإشعارات

## داخل التطبيق (يعمل الآن)
- جرس الإشعارات في الشريط العلوي، يتحدّث فورياً (Realtime).
- صاحب الاستبيان: إشعار عند **وصول إجابة جديدة** على استبيانه.

## بالبريد (يحتاج خطوتين لمرة واحدة)
النظام جاهز: دالة `send-notification-emails` منشورة وتعمل كل دقيقتين، لكنها معطّلة حتى تُضاف المفاتيح.

1. أنشئ حساباً مجانياً في https://resend.com وأنشئ **API Key**. (3000 رسالة/شهر مجاناً)
   - للتجربة يمكنك الإرسال من `onboarding@resend.dev` إلى بريدك فقط. للإرسال للجميع أضف نطاق الوزارة في Resend وأثبته (DNS) — يقوم بذلك قسم IT.
2. في Supabase → Edge Functions → **Secrets** أضف:
   - `RESEND_API_KEY` = المفتاح
   - `MAIL_FROM` = `MEDSB <alerts@نطاق-الوزارة>` (أو `onboarding@resend.dev` للتجربة)
   - `APP_URL` = `https://medsb.vercel.app`
3. في Supabase → SQL Editor نفّذ (مرة واحدة) لتمكين الجدولة، وضع مفتاح **service_role** من Settings → API:
   ```sql
   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
   ```
بعدها تُرسَل الرسائل تلقائياً. يمكن لكل مستخدم إيقاف بريده عبر `profiles.notify_email = false`.
