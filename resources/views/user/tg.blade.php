<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name') }}</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(#0f2a5c, #3b5bdb); color: #fff; font-family: sans-serif; }
        .box { text-align: center; }
        .spin { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; margin: 0 auto 16px; animation: s 1s linear infinite; }
        @keyframes s { to { transform: rotate(360deg); } }
        a { color: #fff; }
    </style>
</head>
<body>
    <div class="box"><div class="spin"></div><p id="msg">Kirish...</p></div>
    <script>
        (function () {
            var tg = window.Telegram && window.Telegram.WebApp;
            var initData = tg && tg.initData;
            if (!initData) { location.replace('{{ route('login') }}'); return; }
            if (tg.expand) tg.expand();
            fetch('{{ route('tg.auth') }}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content },
                credentials: 'same-origin',
                body: JSON.stringify({ init_data: initData })
            })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (x) {
                if (x.ok && x.d.redirect) { location.replace(x.d.redirect); return; }
                document.getElementById('msg').innerHTML = (x.d.message || 'Xatolik') + '<br><br><a href="{{ route('login') }}">Login sahifasi</a>';
            })
            .catch(function () { location.replace('{{ route('login') }}'); });
        })();
    </script>
</body>
</html>
