<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/user/main.jsx'])
</head>
<body class="min-h-screen bg-[#0f2a5c] text-white" style="font-family: Montserrat, sans-serif">
    <div id="app" data-app-name="{{ config('app.name') }}" data-user="{{ auth()->user()->username }}"></div>
</body>
</html>
