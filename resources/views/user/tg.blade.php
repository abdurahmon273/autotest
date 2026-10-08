<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name') }}</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #0f2a5c, #3b5bdb); color: #fff; font-family: Montserrat, sans-serif; padding: 16px; }
        .spin { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; margin: 0 auto 16px; animation: s 1s linear infinite; }
        @keyframes s { to { transform: rotate(360deg); } }
        .center { text-align: center; }
        .modal { display: none; width: 100%; max-width: 420px; background: #fff; color: #111827; border-radius: 24px; padding: 28px 22px 22px; box-shadow: 0 25px 50px rgba(0,0,0,.35); animation: pop .2s ease-out; }
        @keyframes pop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
        .avatar { width: 76px; height: 76px; border-radius: 50%; background: #dbeafe; color: #1d4ed8; font-size: 30px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
        .title { text-align: center; font-size: 14px; color: #6b7280; font-weight: 600; margin: 0 0 4px; }
        .name { text-align: center; font-size: 22px; font-weight: 800; margin: 0 0 14px; word-break: break-word; }
        .row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid #f3f4f6; font-size: 16px; }
        .row span:first-child { color: #6b7280; font-weight: 600; }
        .row span:last-child { font-weight: 700; text-align: right; word-break: break-all; }
        .btns { display: flex; gap: 10px; margin-top: 20px; }
        .btn { flex: 1; height: 52px; border: 0; border-radius: 14px; font: inherit; font-size: 16px; font-weight: 700; cursor: pointer; }
        .btn.other { background: #f3f4f6; color: #374151; }
        .btn.login { background: #1e3a8a; color: #fff; }
        .btn:disabled { opacity: .6; }
        .err { color: #fecaca; margin-top: 12px; font-size: 14px; }
        a { color: #fff; }
    </style>
</head>
<body>
    <div id="loading" class="center"><div class="spin"></div><p id="msg">Tekshirilmoqda...</p></div>

    <div id="modal" class="modal">
        <div class="avatar" id="avatar">?</div>
        <p class="title">Telegram orqali kirish</p>
        <p class="name" id="name"></p>
        <div id="rows"></div>
        <div class="btns">
            <button type="button" class="btn other" id="other">Boshqa</button>
            <button type="button" class="btn login" id="login">Kirish</button>
        </div>
    </div>

    <script>
        (function () {
            var tg = window.Telegram && window.Telegram.WebApp;
            var initData = tg && tg.initData;
            var csrf = document.querySelector('meta[name=csrf-token]').content;
            var LOGIN = '{{ route('login') }}';
            if (!initData) { location.replace(LOGIN); return; }
            if (tg.expand) tg.expand();
            if (tg.ready) tg.ready();

            function post(url, body) {
                return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf }, credentials: 'same-origin', body: JSON.stringify(body || {}) })
                    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
            }
            function fail(text) {
                document.getElementById('loading').style.display = '';
                document.getElementById('modal').style.display = 'none';
                document.getElementById('msg').innerHTML = (text || 'Xatolik') + '<br><br><a href="' + LOGIN + '">Login sahifasi</a>';
                document.querySelector('.spin').style.display = 'none';
            }
            function show(u) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('avatar').textContent = (u.name || '?').trim().charAt(0).toUpperCase();
                document.getElementById('name').textContent = u.name || '';
                var rows = '';
                if (u.username) rows += '<div class="row"><span>Username</span><span>@' + u.username + '</span></div>';
                if (u.phone) rows += '<div class="row"><span>Telefon</span><span>' + u.phone + '</span></div>';
                document.getElementById('rows').innerHTML = rows;
                document.getElementById('modal').style.display = 'block';
            }

            post('{{ route('tg.auth') }}', { init_data: initData })
                .then(function (x) {
                    if (!x.ok) { fail(x.d.message); return; }
                    if (x.d.redirect) { location.replace(x.d.redirect); return; }
                    if (x.d.user) { show(x.d.user); return; }
                    fail();
                })
                .catch(function () { location.replace(LOGIN); });

            document.getElementById('login').addEventListener('click', function () {
                var b = this; b.disabled = true; b.textContent = 'Kirilmoqda...';
                post('{{ route('tg.confirm') }}').then(function (x) {
                    if (x.d.redirect) { location.replace(x.d.redirect); return; }
                    fail(x.d.message);
                }).catch(function () { b.disabled = false; b.textContent = 'Kirish'; });
            });
            document.getElementById('other').addEventListener('click', function () {
                post('{{ route('tg.other') }}').then(function (x) { location.replace((x.d && x.d.redirect) || LOGIN); }).catch(function () { location.replace(LOGIN); });
            });
        })();
    </script>
</body>
</html>
