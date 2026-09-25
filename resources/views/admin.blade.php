<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin · {{ config('app.name') }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/admin/main.jsx'])
</head>
<body class="bg-gray-50 min-h-screen font-inter text-gray-900">
    <div id="app" data-app-name="{{ config('app.name') }}"></div>
</body>
</html>
