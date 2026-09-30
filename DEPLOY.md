# Prava Center — serverga o‘tkazish

## Talablar
- PHP 8.2+ (`gd`, `pdo_mysql`, `mbstring`, `bcmath`, `intl`, `zip`, `fileinfo`)
- MySQL 8 / MariaDB 10.4+
- Composer 2, Node 20+ (faqat build uchun)
- Nginx (yoki Apache), HTTPS (Sanctum cookie uchun shart)

## 1. Kodni yuklash
```bash
git clone <repo> /var/www/autotest && cd /var/www/autotest
composer install --no-dev --optimize-autoloader
npm ci && npm run build      # public/build/ hosil bo‘ladi (yoki lokalda build qilib yuklang)
rm -f public/hot             # dev fayli serverda bo‘lmasligi kerak
```

## 2. `.env`
```bash
cp .env.example .env
php artisan key:generate
```
Majburiy o‘zgartiriladiganlar:
```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://example.uz
APP_LOCALE=uz

DB_CONNECTION=mysql
DB_DATABASE=autotest
DB_USERNAME=...
DB_PASSWORD=...

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SANCTUM_STATEFUL_DOMAINS=example.uz,www.example.uz   # domen(lar), portsiz

LOG_CHANNEL=stack
LOG_STACK=daily,telegram
LOG_LEVEL=error
TELEGRAM_LOG_BOT_TOKEN=<bot token>
TELEGRAM_LOG_CHAT_ID=-100xxxxxxxxxx      # xatolar kanali (bot kanalda admin bo'lishi shart)

```

## 3. Baza va seed (bir marta)
```bash
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
```
Seed nima yaratadi:
- Rollar: Admin, Teacher, Student; 47 ta ruxsat (Admin roliga hammasi)
- Foydalanuvchilar: admin — `admin@autotest.uz` / `admin123` (`/admin/login`); `teacher` / `teacher123`, `student` / `student123` (`/login`). Seeddan keyin parollarni admin panelda almashtiring.
- Tillar: Uzbek (lotin) `latin` — birlamchi, Uzbek (krill) `krill`
- 20 ta asosiy mavzu (lotin + krill nomlari, emoji)
- 3 ta namunaviy savol (2 tasi rasmli), rasmlar `public/backup/images/` dan `storage/app/public/images/` ga ko‘chiriladi
- `global_settings`: birlamchi til, jarima imkoniyatlar soni = 3

`StudentSeeder` (30 ta fake student) faqat `APP_ENV=local` da ishlaydi — serverda ishlamaydi.

To‘liq 71–100 bilet savollari kerak bo‘lsa (237 ta): `php artisan db:seed --class=BiletQuestionsSeeder --force`
(rasmlar `database/seeders/data/images/` dan olinadi).

## 4. Ruxsatlar va kesh
```bash
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
php artisan config:cache && php artisan route:cache && php artisan view:cache
```
Keyingi deploylarda: `git pull && composer install --no-dev && npm run build && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan queue:restart`.

## 4.1 Queue worker (majburiy)
Uy vazifasi muddati tugashi (`FinishTaskJob`) va Telegram xabarlari navbat (queue) orqali ishlaydi. Serverda doimiy worker bo'lishi shart.
`/etc/supervisor/conf.d/autotest-worker.conf`:
```ini
[program:autotest-worker]
command=php /var/www/autotest/artisan queue:work --sleep=3 --tries=3 --max-time=3600
directory=/var/www/autotest
user=www-data
autostart=true
autorestart=true
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/autotest/storage/logs/worker.log
```
```bash
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start autotest-worker
```
Har deploydan keyin `php artisan queue:restart` — worker yangi kodni oladi.

## 5. Nginx (namuna)
```nginx
server {
    listen 443 ssl http2;
    server_name example.uz;
    root /var/www/autotest/public;
    index index.php;
    client_max_body_size 10M;      # rasm yuklash (savol 4MB, mavzu 2MB)

    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }
    location ~ /\.(?!well-known) { deny all; }
}
```
PHP: `upload_max_filesize=10M`, `post_max_size=12M`.

## 6. Telegram
Admin → Sozlamalar → Telegram sozlamalari → bot token → Saqlash: `https://example.uz/telegram/webhook` ga `setWebhook` yuboriladi (faqat HTTPS domenida ishlaydi). Webhook handler hozircha bo‘sh (`204`).

## 7. Xatolar Telegram kanali
@BotFather dan bot yarating (yoki mavjud botdan foydalaning), yopiq kanal oching, botni kanalga **admin** qilib qo'shing.
Kanal `chat_id` sini olish: kanalga biror xabar yuboring, so'ng
`https://api.telegram.org/bot<TOKEN>/getUpdates` ni oching — `chat.id` `-100...` ko'rinishida bo'ladi.
`.env` ga `TELEGRAM_LOG_*` ni yozib, `php artisan config:cache` qiling. Tekshirish:
```bash
php artisan tinker --execute="Log::error('Telegram log test')"
```
Kanalga `error` va undan yuqori (critical, alert, emergency) darajadagi xatolar keladi. Handler xatosi asosiy ishga ta'sir qilmaydi (jim o'tkaziladi).

## 8. Tekshirish
- `https://example.uz/` — landing
- `https://example.uz/admin/login` — admin (email + parol)
- `https://example.uz/login` — student/teacher (username + parol)
- `https://example.uz/app` — foydalanuvchi qismi (mavzu testlari)
- `curl -I https://example.uz/up` → 200

## Eslatmalar
- `public/backup/` — seed uchun rasmlar/ikonkalar; git’da saqlanadi, o‘chirmang.
- `storage/app/public/` (yuklangan rasmlar) — backup’ga kiritilishi kerak, git’da emas.
- Sanctum cookie auth: `SANCTUM_STATEFUL_DOMAINS` da domen noto‘g‘ri bo‘lsa admin/user API `401` qaytaradi.
- Baza backup: `mysqldump autotest > backup.sql` (cron bilan kunlik tavsiya etiladi).
